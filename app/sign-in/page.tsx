import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo, Disclaimer } from "@/components/shared/brand";
import { Skeleton } from "@/components/ui/states";
import { SignInPanel } from "./sign-in-panel";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

async function Panel({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const { persona } = await searchParams;
  const supabase = isSupabaseConfigured();
  return (
    <SignInPanel
      supabase={supabase}
      demoEnabled={!supabase || process.env.ENABLE_DEMO_LOGIN === "true"}
      highlight={typeof persona === "string" ? persona : undefined}
    />
  );
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const supabase = isSupabaseConfigured();
  return (
    <div className="aurora-bg aurora-animated min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Logo />
        <main id="main" className="mt-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Welcome to EvoPet</h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            {supabase
              ? "Sign in with a magic link sent to your email."
              : "This demo runs without a database. Choose a persona to explore each role. All data is fictional."}
          </p>
          <Suspense fallback={<Skeleton className="mt-8 h-64" />}>
            <Panel searchParams={searchParams} />
          </Suspense>
          <Disclaimer className="mt-10" />
        </main>
      </div>
    </div>
  );
}
