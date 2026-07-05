import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, listMyTransactions } from "@/lib/api.functions";
import { Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Gift, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Premium Traders" }] }),
  component: Dashboard,
});

function Dashboard() {
  const meFn = useServerFn(getMe);
  const txFn = useServerFn(listMyTransactions);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const { data: txs } = useQuery({ queryKey: ["tx"], queryFn: () => txFn() });

  const w = me?.wallet;
  const p = me?.profile;

  const stats = [
    { label: "Wallet Balance", value: `Rs. ${Number(w?.balance ?? 0).toLocaleString()}`, icon: Wallet, hero: true },
    { label: "Total Deposits", value: `Rs. ${Number(w?.total_deposits ?? 0).toLocaleString()}`, icon: ArrowDownToLine },
    { label: "Total Withdrawn", value: `Rs. ${Number(w?.total_withdrawals ?? 0).toLocaleString()}`, icon: ArrowUpFromLine },
    { label: "Total Rewards", value: `Rs. ${Number(w?.total_rewards ?? 0).toLocaleString()}`, icon: Gift },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Welcome */}
      <section className="glass-strong rounded-3xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back</div>
            <h1 className="mt-1 font-display text-3xl lg:text-4xl">
              {p?.full_name || p?.username || "Trader"}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Crown className="h-4 w-4 text-primary" /> VIP Level {p?.vip_level ?? 0}
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild><Link to="/deposit"><ArrowDownToLine className="h-4 w-4 mr-2" />Deposit</Link></Button>
            <Button variant="outline" asChild className="gold-border"><Link to="/withdraw"><ArrowUpFromLine className="h-4 w-4 mr-2" />Withdraw</Link></Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, hero }) => (
          <div key={label} className={`glass rounded-2xl p-5 relative overflow-hidden group transition hover:-translate-y-0.5 ${hero ? "animate-glow" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className={`mt-3 font-display text-2xl ${hero ? "gold-text text-3xl" : ""}`}>{value}</div>
          </div>
        ))}
      </section>

      {/* Recent txs */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Recent Activity</h2>
          <Link to="/transactions" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!txs?.length ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No transactions yet. Start by making a deposit.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {txs.slice(0, 6).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium capitalize">{tx.kind}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "PP p")}</div>
                </div>
                <div className={`font-medium ${Number(tx.amount) >= 0 ? "text-[var(--success)]" : "text-destructive"}`}>
                  {Number(tx.amount) >= 0 ? "+" : ""}Rs. {Number(tx.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
