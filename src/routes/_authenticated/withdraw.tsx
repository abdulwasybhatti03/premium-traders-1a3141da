import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyWithdrawals, createWithdrawal, getMe } from "@/lib/api.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { StatusBadge } from "./deposit";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({ meta: [{ title: "Withdraw · Premium Traders" }] }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const meFn = useServerFn(getMe);
  const wdFn = useServerFn(listMyWithdrawals);
  const createFn = useServerFn(createWithdrawal);
  const qc = useQueryClient();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const { data: wds } = useQuery({ queryKey: ["wds"], queryFn: () => wdFn() });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [title, setTitle] = useState("");
  const [account, setAccount] = useState("");

  const mut = useMutation({
    mutationFn: (v: any) => createFn({ data: v }),
    onSuccess: () => {
      toast.success("Withdrawal submitted.");
      setAmount(""); setTitle(""); setAccount("");
      qc.invalidateQueries({ queryKey: ["wds"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!title.trim() || !account.trim()) return toast.error("Enter account details");
    mut.mutate({ amount: amt, method_type: method, account_title: title, account_number: account });
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-4xl">
      <div>
        <h1 className="font-display text-3xl">Request a <span className="gold-text">Withdrawal</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">Available balance: <span className="text-foreground font-medium">Rs. {Number(me?.wallet?.balance ?? 0).toLocaleString()}</span></p>
      </div>

      <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Amount (Rs.)</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="jazzcash">JazzCash</SelectItem>
                <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                <SelectItem value="usdt">USDT (TRC20)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Account Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Account Number / Wallet</Label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} required maxLength={120} />
          </div>
        </div>
        <Button type="submit" className="w-full sm:w-auto" disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Withdrawal"}
        </Button>
      </form>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg mb-4">Withdrawal History</h2>
        {!wds?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left py-2">Date</th><th className="text-left">Method</th><th className="text-right">Amount</th><th className="text-left px-4">Account</th><th>Status</th></tr>
              </thead>
              <tbody>
                {wds.map((w) => (
                  <tr key={w.id} className="border-t border-border/40">
                    <td className="py-2">{format(new Date(w.created_at), "PP")}</td>
                    <td className="capitalize">{w.method_type}</td>
                    <td className="text-right">Rs. {Number(w.amount).toLocaleString()}</td>
                    <td className="px-4 text-xs text-muted-foreground">{w.account_number}</td>
                    <td><StatusBadge status={w.status} /></td>
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
