import { Link } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export function TopNav() {
  const { user, loading } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white shadow-elevated">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>NovaCRM<span className="text-primary"> AI</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground">Home</Link>
          {user && <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>}
          {user && <Link to="/organizations" className="hover:text-foreground">Organizations</Link>}
        </nav>
        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <span className="hidden text-sm text-muted-foreground md:inline">{user.email}</span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link to="/auth" search={{ mode: "signup" }} className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white shadow-elevated hover:opacity-90">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}