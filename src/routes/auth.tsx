import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TopNav } from "@/components/TopNav";
import { Sparkles, Loader2 } from "lucide-react";
import { syncUserRecord } from "@/server-functions/sync-user";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode, next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const goNext = () => navigate({ to: (next as "/dashboard") ?? "/dashboard" });

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message || "Google sign-in failed");
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (result.error) throw result.error;
        if (result.data.user) {
          await syncUserRecord({
            data: {
              id: result.data.user.id,
              email: result.data.user.email ?? email,
              fullName: fullName || result.data.user.user_metadata?.full_name || null,
              avatarUrl:
                result.data.user.user_metadata?.avatar_url ??
                result.data.user.user_metadata?.picture ??
                null,
              provider: result.data.user.app_metadata?.provider ?? "email",
            },
          });
        }
        if (!result.data.session) {
          toast.success("Account created. You can now sign in.");
          setMode("signin");
          setPassword("");
          return;
        }

        toast.success("Account created");
        goNext();
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        goNext();
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero">
      <TopNav />
      <main className="mx-auto flex max-w-md flex-col px-6 pt-16 pb-24">
        <div className="rounded-2xl border border-border bg-white p-8 shadow-card">
          <div className="mb-6 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-brand text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              {mode === "signup"
                ? "Create your account"
                : mode === "forgot"
                  ? "Reset your password"
                  : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup"
                ? "Start closing more deals with NovaCRM AI."
                : mode === "forgot"
                  ? "We'll email you a reset link."
                  : "Sign in to your workspace."}
            </p>
          </div>

          {mode !== "forgot" && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                <GoogleIcon /> Continue with Google
              </button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or{" "}
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <Field
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="Ada Lovelace"
              />
            )}
            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
            />
            {mode !== "forgot" && (
              <Field
                label="Password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
              />
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-elevated hover:opacity-95 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            {mode === "signin" && (
              <>
                <button
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
                <div className="text-muted-foreground">
                  New here?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="font-medium text-primary hover:underline"
                  >
                    Create an account
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <button
                onClick={() => setMode("signin")}
                className="text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link to="/" className="underline">
            terms
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/20 transition focus:border-ring focus:ring-4"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.98 6.98 0 0 1 5.47 12c0-.73.13-1.44.36-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
