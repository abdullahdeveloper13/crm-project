import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { useSession } from "@/hooks/use-session";
import {
  ArrowRight,
  Bot,
  Building2,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  LayoutDashboard,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NovaCRM AI | AI-powered CRM for modern sales teams" },
      {
        name: "description",
        content:
          "NovaCRM AI unifies leads, deals, and customer conversations with AI copilots for focused sales teams.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useSession();

  return (
    <div className="min-h-screen bg-hero">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-20 pb-24 text-center md:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Now with AI copilots for every deal
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
            The CRM your sales team will
            <span className="text-gradient-brand"> actually love</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            NovaCRM AI unifies leads, pipelines, and conversations — then layers on AI copilots that
            draft emails, score leads, and summarize meetings so your team can focus on closing.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {!loading && user ? (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-elevated hover:opacity-95"
                >
                  <LayoutDashboard className="h-4 w-4" /> Go to Dashboard{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/organizations"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <Building2 className="h-4 w-4" /> Manage Workspaces
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-elevated hover:opacity-95"
                >
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/auth"
                  className="rounded-xl border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>

        <section id="about" className="grid gap-6 py-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">About</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              A calmer CRM built for focused teams
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            NovaCRM AI brings organizations, contacts, and deal flow into one workspace with a clean
            interface that stays out of the way until you need it.
          </p>
        </section>

        {/* Feature grid */}
        <section id="how-it-works" className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Building2,
              title: "Organizations & workspaces",
              desc: "Multi-tenant orgs with granular roles: owner, admin, manager, sales, support, employee, viewer.",
            },
            {
              icon: Users,
              title: "Invite your team",
              desc: "Send secure invitations by email, assign roles, and onboard teammates in seconds.",
            },
            {
              icon: Bot,
              title: "AI copilots",
              desc: "Draft emails, score leads, and summarize meetings — powered by the latest models.",
            },
            {
              icon: Zap,
              title: "Pipeline that flows",
              desc: "Kanban deals, activities, follow-ups, and reminders that keep every rep on track.",
            },
            {
              icon: ShieldCheck,
              title: "Secure by default",
              desc: "Row-level security, protected routes, and audited access for every organization.",
            },
            {
              icon: Sparkles,
              title: "Beautiful UI",
              desc: "A workspace inspired by Stripe and Linear — fast, focused, and delightful to use.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-white/80 p-6 shadow-card backdrop-blur"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>

        <section
          id="contact"
          className="mt-24 rounded-3xl border border-border bg-white/80 p-10 shadow-card"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Need help getting set up?</h2>
            <p className="mt-3 text-muted-foreground">
              If your Supabase project is still empty, apply the database migration first and then
              create your first organization from the Organizations page.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24 overflow-hidden rounded-3xl bg-brand p-10 text-center text-white shadow-elevated md:p-16">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to modernize your revenue engine?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Create your first organization in under a minute. No credit card required.
          </p>
          {!loading && user ? (
            <Link
              to="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-white/90"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-white/90"
            >
              Create your workspace <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </section>
      </main>
      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NovaCRM AI. Built with care.
      </footer>
    </div>
  );
}
