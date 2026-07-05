import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview } from "@/lib/api.functions";
import { Users, ArrowDownToLine, ArrowUpFromLine, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const fn = useServerFn(adminOverview);
  const { data } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  const cards = [
    { label: "Total Users", value: data?.totalUsers ?? 0, icon: Users },
    { label: "Pending Deposits", value: data?.pendingDeposits ?? 0, icon: Clock },
    { label: "Approved Deposits", value: `Rs. ${Number(data?.totalDeposits ?? 0).toLocaleString()}`, icon: ArrowDownToLine },
    { label: "Approved Withdrawals", value: `Rs. ${Number(data?.totalWithdrawals ?? 0).toLocaleString()}`, icon: ArrowUpFromLine },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-display text-2xl">{value}</div>
        </div>
      ))}
    </div>
  );
}
