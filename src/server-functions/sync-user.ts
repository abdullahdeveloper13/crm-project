import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client-server";

type SyncUserInput = {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  provider?: string | null;
};

export const syncUserRecord = createServerFn({ method: "POST" })
  .validator((input: SyncUserInput) => input)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("users").upsert({
      id: data.id,
      email: data.email,
      full_name: data.fullName ?? data.email.split("@")[0] ?? null,
      avatar_url: data.avatarUrl ?? null,
      provider: data.provider ?? "email",
    });

    if (error) throw error;

    return { ok: true as const };
  });
