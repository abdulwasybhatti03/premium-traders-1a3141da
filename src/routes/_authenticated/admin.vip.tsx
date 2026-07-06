import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVipTiers, adminListUsers } from "@/lib/api.functions";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/vip")({
  component: AdminVip,
});

function AdminVip() {
  const tiersFn = useServerFn(listVipTiers);
  const usersFn = useServerFn(adminListUsers);
  const { data: tiers } = useQuery({ queryKey: ["vip-tiers"], queryFn: () => tiersFn() });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => usersFn() });

  const countByLevel = (lvl: number) => (users ?? []).filter((u: any) => u.vip_level === lvl).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tiers ?? []).map((t: any) => (
          <div key={t.level} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5" style={{ color: t.color }} />
                <div className="font-display text-lg">{t.name}</div>
              </div>
              <div className="text-xs text-muted-foreground">Level {t.level}</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Min deposit</div>
                <div className="font-medium">Rs. {Number(t.min_deposit).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Bonus</div>
                <div className="font-medium">+{Number(t.daily_bonus_percent)}%</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Users</div>
                <div className="font-medium">{countByLevel(t.level)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-4">VIP Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="text-left py-2 pr-3">User</th>
                <th className="text-left py-2 pr-3">Email</th>
                <th className="text-left py-2 pr-3">VIP Level</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).filter((u: any) => u.vip_level > 0).map((u: any) => (
                <tr key={u.id} className="border-b border-border/20">
                  <td className="py-2 pr-3">{u.full_name || u.username}</td>
                  <td className="py-2 pr-3">{u.email}</td>
                  <td className="py-2 pr-3">Level {u.vip_level}</td>
                  <td className="py-2">{u.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
