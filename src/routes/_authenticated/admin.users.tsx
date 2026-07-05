import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers } from "@/lib/api.functions";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const fn = useServerFn(adminListUsers);
  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: () => fn() });

  return (
    <div className="glass rounded-2xl p-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="text-left py-2 px-2">Name</th><th className="text-left">Email</th><th className="text-left">Country</th><th className="text-center">VIP</th><th className="text-left">Status</th><th className="text-left">Joined</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((u) => (
            <tr key={u.id} className="border-t border-border/40">
              <td className="py-2 px-2">
                <div className="font-medium">{u.full_name || u.username || "—"}</div>
                <div className="text-xs text-muted-foreground">@{u.username}</div>
              </td>
              <td>{u.email}</td>
              <td className="text-muted-foreground">{u.country ?? "—"}</td>
              <td className="text-center">{u.vip_level}</td>
              <td className="capitalize">{u.status}</td>
              <td>{format(new Date(u.created_at), "PP")}</td>
            </tr>
          ))}
          {!data?.length && (
            <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No users yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
