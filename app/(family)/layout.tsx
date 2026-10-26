import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { getSession } from "@/lib/session";

export default async function FamilyLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <>
      <div className="border-b border-rule bg-paper">
        <nav className="mx-auto max-w-5xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/newsletter" className="btn btn-secondary !min-h-11 !px-4 whitespace-nowrap">
              The Newsletter
            </Link>
            <Link href="/write" className="btn btn-primary !min-h-11 !px-4 whitespace-nowrap">
              Write a Story
            </Link>
          </div>

          <form action={logoutAction} className="flex items-center gap-3">
            {session?.name ? (
              <span className="text-muted text-sm">
                Signed in as{" "}
                <strong className="text-ink font-semibold">{session.name}</strong>
              </span>
            ) : null}
            <button type="submit" className="text-sm underline text-muted hover:text-accent">
              Sign out
            </button>
          </form>
        </nav>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-rule mt-16 py-8 text-center text-muted text-sm">
        A private newsletter for our family. Please don&rsquo;t share the
        password outside it.
      </footer>
    </>
  );
}
