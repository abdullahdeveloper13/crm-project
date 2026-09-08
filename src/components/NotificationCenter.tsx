import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, Trash2, Mail, Sparkles, CheckCheck } from "lucide-react";
import { formatDate } from "@/lib/crm-helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationCenterProps = {
  userId: string;
};

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((n) => n.status !== "read").map((n) => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const unreadCount = notifications.filter((n) => n.status !== "read").length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-brand text-[9px] font-bold text-white shadow-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 rounded-2xl p-0 shadow-xl border-border"
      >
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[350px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <Sparkles className="mx-auto h-6 w-6 text-muted-foreground/60 mb-2" />
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = n.status !== "read";

              return (
                <div
                  key={n.id}
                  className={`flex items-start justify-between gap-3 p-3.5 transition hover:bg-muted/30 ${
                    isUnread ? "bg-accent/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    <div
                      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                        isUnread ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        {n.title}
                        {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {formatDate(n.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isUnread && (
                      <button
                        onClick={() => markAsRead.mutate(n.id)}
                        title="Mark as read"
                        className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification.mutate(n.id)}
                      title="Delete notification"
                      className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
