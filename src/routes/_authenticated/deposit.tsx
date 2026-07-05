import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPaymentMethods, listMyDeposits, createDeposit } from "@/lib/api.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/deposit")({
  head: () => ({ meta: [{ title: "Deposit · Premium Traders" }] }),
  component: DepositPage,
});

function DepositPage() {
  const pmFn = useServerFn(listPaymentMethods);
  const depFn = useServerFn(listMyDeposits);
  const createFn = useServerFn(createDeposit);
  const qc = useQueryClient();

  const { data: methods } = useQuery({ queryKey: ["pm"], queryFn: () => pmFn() });
  const { data: deposits } = useQuery({ queryKey: ["deps"], queryFn: () => depFn() });

  const [methodId, setMethodId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const selected = methods?.find((m) => m.id === methodId);

  const mut = useMutation({
    mutationFn: (v: { payment_method_id: string; amount: number; reference?: string }) => createFn({ data: v }),
    onSuccess: () => {
      toast.success("Deposit submitted. Awaiting admin approval.");
      setAmount(""); setReference("");
      qc.invalidateQueries({ queryKey: ["deps"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    setCopied(v); setTimeout(() => setCopied(null), 1500);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodId) return toast.error("Select a payment method");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!reference.trim()) return toast.error("Enter a transaction reference");
    mut.mutate({ payment_method_id: methodId, amount: amt, reference });
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-5xl">
      <div>
        <h1 className="font-display text-3xl">Make a <span className="gold-text">Deposit</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a payment method, transfer, then submit proof for approval.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: choose method */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg">1. Payment Method</h2>
          <div className="grid grid-cols-2 gap-3">
            {methods?.map((m) => (
              <button key={m.id} onClick={() => setMethodId(m.id)}
                className={cn("rounded-xl border p-4 text-left transition", methodId === m.id ? "gold-border bg-primary/10" : "border-border hover:bg-secondary")}>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{m.method_type}</div>
                <div className="font-medium mt-1">{m.label}</div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="mt-4 space-y-3 rounded-xl border border-border/50 bg-background/40 p-4">
              <Row label="Account Title" value={selected.account_title ?? "—"} onCopy={copy} copied={copied} />
              <Row label="Account Number" value={selected.account_number ?? "—"} onCopy={copy} copied={copied} />
              <p className="text-xs text-muted-foreground mt-2">Transfer the exact amount to the details above, then submit the form.</p>
            </div>
          )}
        </div>

        {/* Right: submit form */}
        <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg">2. Submit Proof</h2>
          <div className="space-y-2">
            <Label>Amount (Rs.)</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Transaction Reference / TID</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} required maxLength={200} />
          </div>
          <Button type="submit" className="w-full" disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Deposit"}
          </Button>
        </form>
      </div>

      {/* History */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg mb-4">Deposit History</h2>
        {!deposits?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No deposits yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left py-2">Date</th><th className="text-left">Method</th><th className="text-right">Amount</th><th className="text-left px-4">Ref</th><th className="text-left">Status</th></tr>
              </thead>
              <tbody>
                {deposits.map((d: any) => (
                  <tr key={d.id} className="border-t border-border/40">
                    <td className="py-2">{format(new Date(d.created_at), "PP")}</td>
                    <td>{d.payment_methods?.label ?? "—"}</td>
                    <td className="text-right">Rs. {Number(d.amount).toLocaleString()}</td>
                    <td className="px-4 text-xs text-muted-foreground">{d.reference}</td>
                    <td><StatusBadge status={d.status} /></td>
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

function Row({ label, value, onCopy, copied }: { label: string; value: string; onCopy: (v: string) => void; copied: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="font-mono text-sm">{value}</div>
      </div>
      <Button type="button" size="icon" variant="ghost" onClick={() => onCopy(value)}>
        {copied === value ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-[var(--warning)]",
    approved: "bg-success/15 text-[var(--success)]",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", map[status] ?? "bg-muted")}>{status}</span>;
}
