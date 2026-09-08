import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const syncedProfileFor = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Check if OAuth callback is in progress in hash or search params
    const hasOAuthParams =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        window.location.search.includes("code=") ||
        window.location.hash.includes("refresh_token"));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session) {
        setSession(data.session);
        setLoading(false);
      } else if (!hasOAuthParams) {
        setSession(null);
        setLoading(false);
      } else {
        // OAuth tokens are in the URL, give Supabase a moment to process the hash
        setTimeout(() => {
          if (mounted) {
            supabase.auth.getSession().then(({ data: secondData }) => {
              if (mounted) {
                setSession(secondData?.session ?? null);
                setLoading(false);
              }
            });
          }
        }, 600);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
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
