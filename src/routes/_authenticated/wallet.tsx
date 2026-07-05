import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/api.functions";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet · Premium Traders" }] }),
  component: WalletPage,
});

function WalletPage() {
  const meFn = useServerFn(getMe);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const w = data?.wallet;

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
      <h1 className="font-display text-3xl">My <span className="gold-text">Wallet</span></h1>

      <div className="glass-strong rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Available Balance</div>
          <div className="mt-2 font-display text-5xl gold-text">Rs. {Number(w?.balance ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Deposits", value: w?.total_deposits, icon: ArrowDownToLine },
          { label: "Total Withdrawals", value: w?.total_withdrawals, icon: ArrowUpFromLine },
          { label: "Total Rewards", value: w?.total_rewards, icon: Gift },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-display text-2xl">Rs. {Number(value ?? 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
