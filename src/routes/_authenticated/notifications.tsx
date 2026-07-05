import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyNotifications, markAllNotificationsRead } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Premium Traders" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markAllNotificationsRead);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifs"], queryFn: () => fn() });
  const mut = useMutation({ mutationFn: () => markFn(), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifs"] }) });

  return (
    <div className="space-y-6 animate-fade-in-up max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          <CheckCheck className="h-4 w-4 mr-2" /> Mark all read
        </Button>
      </div>

      <div className="space-y-3">
        {!data?.length ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto h-10 w-10 mb-3 opacity-40" /> No notifications
          </div>
        ) : data.map((n) => (
          <div key={n.id} className={cn("glass rounded-xl p-4 flex gap-3 items-start", !n.read && "gold-border")}>
            <div className={cn("mt-1 h-2 w-2 rounded-full", n.read ? "bg-muted" : "bg-primary")} />
            <div className="flex-1">
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
              <div className="text-[11px] text-muted-foreground mt-2">{format(new Date(n.created_at), "PP p")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
