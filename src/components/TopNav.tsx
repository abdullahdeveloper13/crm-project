import { Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  ChevronDown,
  LayoutDashboard,
  Building2,
  Settings,
  LifeBuoy,
  LogOut,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/NotificationCenter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { readLastOrgId } from "@/lib/safe-redirect";

export function TopNav() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
  const avatarLabel =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? "";
  const avatarInitial = avatarLabel.trim().charAt(0).toUpperCase() || "U";
  const lastOrgId = typeof window !== "undefined" ? readLastOrgId() : null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white shadow-elevated">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            NovaCRM<span className="text-primary"> AI</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="/#about" className="hover:text-foreground">
            About
          </a>
          <a href="/#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a href="/#contact" className="hover:text-foreground">
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <NotificationCenter userId={user.id} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-2 py-1.5 pr-3 shadow-sm transition hover:bg-muted"
                  >
                    <Avatar className="h-9 w-9 border border-border/60">
                      <AvatarImage src={avatarUrl ?? undefined} alt={avatarLabel} />
                      <AvatarFallback className="bg-slate-900 text-sm font-semibold text-white">
                        {avatarInitial}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 rounded-2xl border-border p-2 shadow-xl"
                >
                  <DropdownMenuLabel className="space-y-1 px-3 py-2">
                    <div className="text-sm font-semibold text-foreground">
                      {user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Account"}
                    </div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/organizations" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Organizations
                    </Link>
                  </DropdownMenuItem>
                  {lastOrgId ? (
                    <DropdownMenuItem asChild>
                      <Link
                        to="/organizations/$orgId"
                        params={{ orgId: lastOrgId }}
                        search={{ tab: "settings" }}
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Workspace Settings
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/organizations" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Workspace Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/support" className="flex items-center gap-2">
                      <LifeBuoy className="h-4 w-4" />
                      Help & support
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-red-600 focus:text-red-600"
                    onSelect={(event) => {
                      event.preventDefault();
                      void handleSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white shadow-elevated hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
