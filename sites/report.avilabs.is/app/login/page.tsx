import { LoginForm } from "./LoginForm.tsx";
import { safeNext } from "@/lib/safe-next.ts";
import { basePath } from "@/lib/base-path.ts";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="login">
      <img src={`${basePath}/plan3logo.svg`} alt="Plan3" width={120} />
      <LoginForm next={safeNext(next)} />
    </main>
  );
}
