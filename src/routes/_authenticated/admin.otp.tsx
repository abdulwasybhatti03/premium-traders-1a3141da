import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminCreateOtp, adminListOtps } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/otp")({
  component: AdminOtp,
});

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "PT-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function AdminOtp() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListOtps);
  const createFn = useServerFn(adminCreateOtp);
  const { data } = useQuery({ queryKey: ["admin-otps"], queryFn: () => listFn() });

  const [code, setCode] = useState(genCode());
  const [pct, setPct] = useState(20);
  const [hours, setHours] = useState(24);

  const mut = useMutation({
    mutationFn: () => createFn({ data: { code, reward_percent: pct, hours_valid: hours } }),
    onSuccess: () => {
      toast.success("Daily OTP published to all users");
      setCode(genCode());
      qc.invalidateQueries({ queryKey: ["admin-otps"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl">Publish Today's OTP</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Code</Label>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono uppercase tracking-widest" />
              <Button type="button" variant="outline" onClick={() => setCode(genCode())}>
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reward %</Label>
            <Input type="number" min={0} max={100} step="0.1" value={pct} onChange={(e) => setPct(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Valid (hours)</Label>
            <Input type="number" min={1} max={72} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !code}>
            {mut.isPending ? "Publishing…" : "Publish OTP"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Replaces today's active code. All users receive a notification.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-4">Recent OTPs</h2>
        {!data?.length ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No OTPs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left py-2 pr-3">Date</th>
                  <th className="text-left py-2 pr-3">Code</th>
                  <th className="text-left py-2 pr-3">Reward %</th>
                  <th className="text-left py-2 pr-3">Expires</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((o: any) => {
                  const expired = new Date(o.expires_at).getTime() < Date.now();
                  return (
                    <tr key={o.id} className="border-b border-border/20">
                      <td className="py-2 pr-3">{o.active_date}</td>
                      <td className="py-2 pr-3 font-mono">{o.code}</td>
                      <td className="py-2 pr-3">{Number(o.reward_percent)}%</td>
                      <td className="py-2 pr-3">{format(new Date(o.expires_at), "PP p")}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${expired ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>
                          {expired ? "Expired" : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
