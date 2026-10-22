import { LoginForm } from "./LoginForm.tsx";
import { safeNext } from "@/lib/safe-next.ts";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="login">
      <img src="/plan3logo.svg" alt="Plan3" width={120} />
      <LoginForm next={safeNext(next)} />
    </main>
  );
}
