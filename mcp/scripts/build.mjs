// Builds the Vercel deployment with the Build Output API (.vercel/output), so bundling is
// under our control: the site's rules come from src/generated (scripts/gen-rules.mjs), and
// sharp's native packages are copied next to the function.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, ".vercel", "output");
const fn = path.join(out, "functions", "index.func");

execFileSync(process.execPath, [path.join(root, "scripts", "gen-rules.mjs")], { stdio: "inherit" });

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(fn, { recursive: true });

await build({
  entryPoints: [path.join(root, "src", "vercel.ts")],
  outfile: path.join(fn, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["sharp"],
  logLevel: "warning",
  banner: { js: `import { createRequire as __mcpCreateRequire } from "node:module";\nconst require = __mcpCreateRequire(import.meta.url);` },
});

// sharp and the packages it loads at runtime (its prebuilt libvips binaries included).
const copied = new Set();
function copyPackage(name) {
  if (copied.has(name)) return;
  const src = path.join(root, "node_modules", name);
  if (!fs.existsSync(src)) return; // an optional dependency for another platform
  copied.add(name);
  fs.cpSync(src, path.join(fn, "node_modules", name), { recursive: true, dereference: true });
  const pkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) copyPackage(dep);
}
copyPackage("sharp");

fs.writeFileSync(path.join(fn, "package.json"), JSON.stringify({ type: "module" }) + "\n");
fs.writeFileSync(
  path.join(fn, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false, supportsResponseStreaming: true, maxDuration: 60 }, null, 2) + "\n",
);
fs.writeFileSync(path.join(out, "config.json"), JSON.stringify({ version: 3, routes: [{ src: "/(.*)", dest: "/index" }] }, null, 2) + "\n");
console.log(`build: .vercel/output (function + ${copied.size} runtime packages)`);
