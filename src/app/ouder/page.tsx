import Link from "next/link";
import { OuderLoginForm } from "./ouder-login-form";

export default function OuderPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 pt-12 pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50vh] bg-[radial-gradient(ellipse_at_top,rgba(37,244,238,0.25),transparent_60%)]"
      />

      <header className="flex flex-col gap-6">
        <Link href="/" className="text-sm text-fg-muted hover:text-fg">
          ← terug
        </Link>
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan">
            manager login
          </span>
          <h1 className="text-5xl font-bold leading-none tracking-tight">
            Manager
            <br />
            <span className="text-gradient">dashboard</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Vul de admincode in om posts te liken en likes uit te delen.
          </p>
        </div>
      </header>

      <OuderLoginForm />
    </main>
  );
}
