import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, updateProfile } from "@/lib/api.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · Premium Traders" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const meFn = useServerFn(getMe);
  const updFn = useServerFn(updateProfile);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  const [form, setForm] = useState({ full_name: "", username: "", phone: "", country: "" });
  useEffect(() => {
    if (data?.profile) setForm({
      full_name: data.profile.full_name ?? "",
      username: data.profile.username ?? "",
      phone: data.profile.phone ?? "",
      country: data.profile.country ?? "",
    });
  }, [data]);

  const mut = useMutation({
    mutationFn: (v: any) => updFn({ data: v }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in-up max-w-3xl">
      <h1 className="font-display text-3xl">My <span className="gold-text">Profile</span></h1>

      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[var(--gold-soft)] flex items-center justify-center font-display text-2xl text-primary-foreground">
            {(data?.profile?.full_name ?? "T").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-display text-xl">{data?.profile?.full_name || "Trader"}</div>
            <div className="text-sm text-muted-foreground">{data?.profile?.email}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
              <Crown className="h-3 w-3" /> VIP {data?.profile?.vip_level ?? 0}
            </div>
          </div>
        </div>
      </div>

      <form
        className="glass rounded-2xl p-6 space-y-4"
        onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
        </div>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
