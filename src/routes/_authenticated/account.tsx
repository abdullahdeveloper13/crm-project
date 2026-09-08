import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, UserRound } from "lucide-react";
import { toUserFacingError, logTechnicalError } from "@/lib/supabase-errors";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = useSession();
  const [fullName, setFullName] = useState(
    () => user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "",
  );
  const [password, setPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (authError) throw authError;
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim() || null,
      });
      if (profileError) throw profileError;
      toast.success("Profile updated");
    } catch (error) {
      logTechnicalError("update profile", error);
      toast.error(toUserFacingError(error, "Profile could not be updated."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      toast.success("Password updated");
    } catch (error) {
      logTechnicalError("update password", error);
      toast.error(toUserFacingError(error, "Password could not be updated."));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This name is used across workspaces and invitations.
        </p>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20"
            />
          </label>
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            Save profile
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-card">
        <h2 className="font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a new password for email sign-in. OAuth-only accounts may not support this.
        </p>
        <form onSubmit={savePassword} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">New password</span>
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20"
            />
          </label>
          <button
            type="submit"
            disabled={savingPassword || password.length < 6}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </button>
        </form>
      </section>
    </main>
  );
}
