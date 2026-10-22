import Link from "next/link";
import { getViewer } from "@/lib/auth.ts";
import { signOut } from "../actions.ts";

export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getViewer();
  return (
    <>
      <section className="mainMenu">
        <div className="container">
          <div className="flex ac sbw">
            <div className="col50">
              <Link className="logo" href="/"><img src="/plan3logo.svg" alt="Plan3 Logo" /></Link>
            </div>
            <div className="col50 flex ac jce gap24">
              <form action={signOut} className="userMenu">
                <span title={profile.email}>{profile.full_name || profile.email}</span>
                {profile.role === "editor" && <span className="roleBadge">Editor</span>}
                <button type="submit">Sign out</button>
              </form>
            </div>
          </div>
        </div>
      </section>
      {children}
      <div className="divider" />
      <section className="footer">
        <div className="container">&copy; {new Date().getFullYear()} AviLabs | All Rights Reserved</div>
      </section>
    </>
  );
}
