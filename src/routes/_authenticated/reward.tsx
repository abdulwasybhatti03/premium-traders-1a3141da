import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveOtp, claimDailyOtp, listMyOtpClaims, getMe } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Clock, CheckCircle2, Sparkles, History } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/reward")({
  head: () => ({ meta: [{ title: "Daily Reward · Premium Traders" }] }),
  component: RewardPage,
});

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function RewardPage() {
  const qc = useQueryClient();
  const activeFn = useServerFn(getActiveOtp);
  const claimsFn = useServerFn(listMyOtpClaims);
  const meFn = useServerFn(getMe);
  const claimFn = useServerFn(claimDailyOtp);

  const { data: active } = useQuery({ queryKey: ["active-otp"], queryFn: () => activeFn(), refetchInterval: 30_000 });
  const { data: claims } = useQuery({ queryKey: ["my-otp-claims"], queryFn: () => claimsFn() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  const [code, setCode] = useState("");
  const countdown = useCountdown(active?.otp?.expires_at);

  const mut = useMutation({
    mutationFn: (c: string) => claimFn({ data: { code: c } }),
    onSuccess: (r) => {
      toast.success(`Reward credited: Rs. ${Number(r.reward).toLocaleString()}`);
      setCode("");
      qc.invalidateQueries({ queryKey: ["active-otp"] });
      qc.invalidateQueries({ queryKey: ["my-otp-claims"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["tx"] });
      qc.invalidateQueries({ queryKey: ["notifs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to claim reward"),
  });

  const totalDeposits = Number(me?.wallet?.total_deposits ?? 0);
  const rewardPct = Number(active?.otp?.reward_percent ?? 0);
  const projected = useMemo(() => Math.round(totalDeposits * (rewardPct / 100) * 100) / 100, [totalDeposits, rewardPct]);

  return (
    <div className="space-y-6 animate-fade-in-up max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Gift className="h-5 w-5" />
        </div>
        <h1 className="font-display text-3xl">Daily <span className="gold-text">Reward</span></h1>
      </div>

      <div className="glass-strong rounded-3xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative space-y-5">
          {!active?.otp ? (
            <div className="text-center py-6">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <div className="font-display text-xl">No reward code is active right now</div>
              <p className="text-sm text-muted-foreground mt-1">
                A new code is published daily at 5PM. Check back soon.
              </p>
            </div>
          ) : active.claimed ? (
            <div className="text-center py-6">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--success)] mb-2" />
              <div className="font-display text-xl">You've claimed today's reward</div>
              <p className="text-sm text-muted-foreground mt-1">
                Rs. {Number(active.claim?.amount ?? 0).toLocaleString()} credited to your wallet.
              </p>
              <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Next code in {countdown ?? "…"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Today's Reward</div>
                  <div className="mt-1 font-display text-4xl gold-text">{rewardPct}%</div>
                  <div className="text-xs text-muted-foreground">of your approved deposits</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Expires in</div>
                  <div className="mt-1 font-mono text-2xl">{countdown ?? "—"}</div>
                </div>
              </div>

              <div className="rounded-xl bg-secondary/60 p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Estimated reward (base)</div>
                  <div className="font-display text-xl">Rs. {projected.toLocaleString()}</div>
                </div>
                <Sparkles className="h-6 w-6 text-primary" />
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); if (code.trim()) mut.mutate(code.trim()); }}
                className="space-y-2"
              >
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Enter today's code</label>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PT-XYZ123"
                    className="text-lg tracking-widest font-mono uppercase"
                    maxLength={30}
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={mut.isPending || !code.trim()} className="shrink-0">
                    {mut.isPending ? "Claiming…" : "Claim"}
                  </Button>
                </div>
                {totalDeposits <= 0 && (
                  <p className="text-xs text-destructive">You need at least one approved deposit to claim rewards.</p>
                )}
              </form>
            </>
          )}
        </div>
      </div>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl">Recent Claims</h2>
        </div>
        {!claims?.length ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No claims yet.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {claims.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">
                    {c.daily_otps?.reward_percent ? `${c.daily_otps.reward_percent}% reward` : "Reward"}
                    <span className="ml-2 text-xs text-muted-foreground">VIP {c.vip_level}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(c.created_at), "PP p")}</div>
                </div>
                <div className="font-medium text-[var(--success)]">+Rs. {Number(c.amount).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
