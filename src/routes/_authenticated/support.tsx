import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Mail, ShieldCheck, Database } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
});

function SupportPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Help & support</h1>
          <p className="text-sm text-muted-foreground">Setup guidance and contact details.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <h2 className="font-semibold">Contact</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Email the team at{" "}
          <a className="font-medium text-primary underline" href="mailto:hello@novacrm.ai">
            hello@novacrm.ai
          </a>
          . Include your workspace name and a short description of the issue.
        </p>
      </section>

      <section className="mt-6 space-y-4 rounded-2xl border border-border bg-white p-6 shadow-card">
        <h2 className="font-semibold">Common setup issues</h2>
        <div className="flex gap-3">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            If organization creation fails, apply the SQL files in{" "}
            <code className="rounded bg-muted px-1">supabase/migrations</code> to your Supabase
            project, then retry.
          </p>
        </div>
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Google sign-in only works after the Google provider is enabled in the Supabase Auth
            dashboard.
          </p>
        </div>
        <div className="flex gap-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Team invites create a shareable link. Outbound invite email requires a configured mail
            provider in Supabase.
          </p>
        </div>
      </section>

      <p className="mt-6 text-sm text-muted-foreground">
        Need a workspace?{" "}
        <Link to="/organizations" className="font-medium text-primary hover:underline">
          Open organizations
        </Link>
        .
      </p>
    </main>
  );
}
