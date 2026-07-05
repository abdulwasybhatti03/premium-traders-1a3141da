import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListWithdrawals, adminReviewWithdrawal } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { StatusBadge } from "./deposit";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  component: AdminWithdrawals,
});

function AdminWithdrawals() {
  const [status, setStatus] = useState("pending");
  const listFn = useServerFn(adminListWithdrawals);
  const reviewFn = useServerFn(adminReviewWithdrawal);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-wds", status], queryFn: () => listFn({ data: { status } }) });

  const mut = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => reviewFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-wds"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass rounded-2xl p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="text-left py-2 px-2">User</th><th className="text-right">Amount</th><th className="text-left px-4">Account</th><th className="text-left">Date</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((w: any) => (
              <tr key={w.id} className="border-t border-border/40">
                <td className="py-2 px-2">
                  <div className="font-medium">{w.profiles?.full_name || w.profiles?.username || "—"}</div>
                  <div className="text-xs text-muted-foreground">{w.profiles?.email}</div>
                </td>
                <td className="text-right">Rs. {Number(w.amount).toLocaleString()}</td>
                <td className="px-4 text-xs">{w.method_type} · {w.account_number}</td>
                <td>{format(new Date(w.created_at), "PP")}</td>
                <td><StatusBadge status={w.status} /></td>
                <td className="text-right">
                  {w.status === "pending" && (
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => mut.mutate({ id: w.id, approve: true })}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: w.id, approve: false })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No withdrawals.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
