import { getViewer } from "@/lib/auth.ts";
import { NavLinks } from "@/components/NavLinks.tsx";

const SUB_MENU = [
  { href: "/customers/airlines", label: "Airlines" },
  { href: "/customers/features", label: "Features" },
  { href: "/customers/finance", label: "Finance" },
  { href: "/customers/snapshot", label: "Snapshot" },
];

export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getViewer();
  const links = profile.role === "editor" ? [...SUB_MENU, { href: "/customers/edit", label: "Edit" }] : SUB_MENU;
  return (
    <>
      <section className="title">
        <div className="container">
          <div className="flex">
            <div className="col50"><h1>Customers</h1></div>
            <div className="col50 flex jce">
              <NavLinks className="subMenu" activeClass="subMenuActive" links={links} />
            </div>
          </div>
        </div>
      </section>
      {children}
    </>
  );
}
