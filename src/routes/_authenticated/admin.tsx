import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/api.functions";
import { Shield, Users, ArrowDownToLine, ArrowUpFromLine, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Premium Traders" }] }),
  component: AdminLayout,
});

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { to: "/admin/users", label: "Users", icon: Users },
] as const;

function AdminLayout() {
  const meFn = useServerFn(getMe);
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) return <div className="animate-pulse text-muted-foreground">Loading…</div>;

  if (!data?.isAdmin) {
    return (
      <div className="glass-strong rounded-2xl p-10 text-center max-w-md mx-auto">
        <Shield className="mx-auto h-12 w-12 text-destructive mb-3" />
        <h1 className="font-display text-2xl">Access Denied</h1>
        <p className="text-sm text-muted-foreground mt-2">Only administrators can access this area.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <h1 className="font-display text-3xl">Admin <span className="gold-text">Console</span></h1>
      </div>

      <div className="glass rounded-2xl p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? path === to : path.startsWith(to);
          return (
            <Link key={to} to={to}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm whitespace-nowrap transition",
                active ? "bg-primary text-primary-foreground shadow-[var(--shadow-gold)]" : "hover:bg-secondary",
              )}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
