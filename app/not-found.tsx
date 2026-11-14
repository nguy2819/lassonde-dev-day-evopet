import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="aurora-bg grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-accent">404</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">This page wandered off</h1>
        <p className="mt-2 text-ink-muted">Or you may not have access to it.</p>
        <Button asChild className="mt-6">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
