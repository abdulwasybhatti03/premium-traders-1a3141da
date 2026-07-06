import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, listMyNotifications } from "@/lib/api.functions";
import { LayoutDashboard, Wallet, ArrowDownToLine, ArrowUpFromLine, History, Bell, User, Settings, Shield, LogOut, TrendingUp, Menu, X, Gift, Crown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/reward", label: "Daily Reward", icon: Gift },
  { to: "/vip", label: "VIP Center", icon: Crown },
  { to: "/transactions", label: "Transactions", icon: History },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const meFn = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  const notifFn = useServerFn(listMyNotifications);
  const { data: notifs } = useQuery({ queryKey: ["notifs"], queryFn: () => notifFn(), refetchInterval: 30000 });
  const unread = (notifs ?? []).filter((n) => !n.read).length;

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const NavList = () => (
    <nav className="space-y-1 px-3">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = path === to;
        return (
          <Link key={to} to={to} onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              active
                ? "bg-primary/15 text-foreground gold-border shadow-[var(--shadow-gold)]"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {to === "/notifications" && unread > 0 && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{unread}</span>
            )}
          </Link>
        );
      })}
      {me?.isAdmin && (
        <Link to="/admin" onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
            path.startsWith("/admin")
              ? "bg-primary/15 text-foreground gold-border"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}>
          <Shield className="h-4 w-4" />
          <span>Admin</span>
        </Link>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen hero-bg">
      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/40 bg-background/60 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="font-display text-lg">Premium <span className="gold-text">Traders</span></span>
        </Link>
        <Button size="icon" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-30 w-72 shrink-0 border-r border-border/40 bg-sidebar/80 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}>
          <div className="hidden lg:flex items-center gap-2 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-gold)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg leading-none">Premium</div>
              <div className="gold-text font-display text-lg leading-none">Traders</div>
            </div>
          </div>
          <div className="px-3 pt-4 lg:pt-2">
            <div className="glass mb-4 rounded-xl p-3 mx-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wallet Balance</div>
              <div className="mt-1 font-display text-2xl gold-text">
                Rs. {Number(me?.wallet?.balance ?? 0).toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">VIP {me?.profile?.vip_level ?? 0}</div>
            </div>
            <NavList />
            <div className="px-3 mt-6">
              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-h-screen flex-1 px-4 py-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
