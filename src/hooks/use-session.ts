import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const syncedProfileFor = useRef<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user || syncedProfileFor.current === user.id) return;

    syncedProfileFor.current = user.id;
    const userRow = {
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      provider: user.app_metadata?.provider ?? "email",
    };

    void supabase.from("users").upsert(userRow);
    void supabase.from("profiles").upsert({
      id: user.id,
      full_name: userRow.full_name,
      avatar_url: userRow.avatar_url,
    });
  }, [session]);

  return { session, user: session?.user ?? (null as User | null), loading };
}
