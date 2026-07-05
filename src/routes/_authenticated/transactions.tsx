import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTransactions } from "@/lib/api.functions";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Transactions · Premium Traders" }] }),
  component: TxPage,
});

function TxPage() {
  const fn = useServerFn(listMyTransactions);
  const { data } = useQuery({ queryKey: ["tx"], queryFn: () => fn() });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((t) => !s || t.kind.includes(s) || t.note?.toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl">
      <h1 className="font-display text-3xl">Transaction <span className="gold-text">History</span></h1>
      <Input placeholder="Search kind or note…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      <div className="glass rounded-2xl p-6">
        {!filtered.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No transactions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left py-2">Date</th><th className="text-left">Kind</th><th className="text-left">Note</th><th className="text-right">Amount</th></tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border/40">
                    <td className="py-2">{format(new Date(t.created_at), "PP p")}</td>
                    <td className="capitalize">{t.kind}</td>
                    <td className="text-muted-foreground">{t.note}</td>
                    <td className={`text-right font-medium ${Number(t.amount) >= 0 ? "text-[var(--success)]" : "text-destructive"}`}>
                      {Number(t.amount) >= 0 ? "+" : ""}Rs. {Number(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
