import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, listVipTiers } from "@/lib/api.functions";
import { Crown, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/vip")({
  head: () => ({ meta: [{ title: "VIP Center · Premium Traders" }] }),
  component: VipCenter,
});

function VipCenter() {
  const meFn = useServerFn(getMe);
  const tiersFn = useServerFn(listVipTiers);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const { data: tiers } = useQuery({ queryKey: ["vip-tiers"], queryFn: () => tiersFn() });

  const level = me?.profile?.vip_level ?? 0;
  const totalDep = Number(me?.wallet?.total_deposits ?? 0);
  const current = tiers?.find((t: any) => t.level === level);
  const next = tiers?.find((t: any) => t.level === level + 1);
  const progress = next ? Math.min(100, (totalDep / Number(next.min_deposit)) * 100) : 100;
  const remaining = next ? Math.max(0, Number(next.min_deposit) - totalDep) : 0;

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Crown className="h-5 w-5" />
        </div>
        <h1 className="font-display text-3xl">VIP <span className="gold-text">Center</span></h1>
      </div>

      <section className="glass-strong rounded-3xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
          style={{ background: `${current?.color ?? "#D4AF37"}55` }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Current Tier</div>
            <div className="mt-2 flex items-center gap-3">
              <Crown className="h-8 w-8" style={{ color: current?.color ?? "#D4AF37" }} />
              <div>
                <div className="font-display text-3xl">{current?.name ?? "Starter"}</div>
                <div className="text-xs text-muted-foreground">Level {level} · +{Number(current?.daily_bonus_percent ?? 0)}% daily bonus</div>
              </div>
            </div>
          </div>
          <div className="flex-1 lg:max-w-md">
            {next ? (
              <>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Progress to {next.name}</span>
                  <span className="font-medium">Rs. {totalDep.toLocaleString()} / {Number(next.min_deposit).toLocaleString()}</span>
                </div>
                <Progress value={progress} />
                <div className="mt-2 text-xs text-muted-foreground">
                  Deposit Rs. {remaining.toLocaleString()} more to unlock {next.name}.
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">You've reached the highest tier. 🎉</div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tiers ?? []).map((t: any) => {
          const unlocked = level >= t.level;
          const isCurrent = level === t.level;
          return (
            <div key={t.level}
              className={cn(
                "glass rounded-2xl p-5 relative overflow-hidden transition",
                isCurrent && "gold-border shadow-[var(--shadow-gold)]",
                !unlocked && "opacity-70",
              )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5" style={{ color: t.color }} />
                  <div className="font-display text-lg">{t.name}</div>
                </div>
                {isCurrent ? (
                  <span className="text-[10px] uppercase tracking-widest rounded-full bg-primary/20 text-primary px-2 py-0.5">Current</span>
                ) : unlocked ? (
                  <Check className="h-4 w-4 text-[var(--success)]" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="mt-3 text-xs text-muted-foreground uppercase tracking-widest">Required deposits</div>
              <div className="font-display text-xl">Rs. {Number(t.min_deposit).toLocaleString()}</div>
              <div className="mt-3 text-xs text-muted-foreground uppercase tracking-widest">Daily bonus</div>
              <div className="font-display text-xl">+{Number(t.daily_bonus_percent)}%</div>
              {Array.isArray(t.perks) && t.perks.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-sm">
                  {t.perks.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
