import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, Zap, Crown, ArrowRight, LineChart, Wallet, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Premium Traders — Luxury Trading & Investment Platform" },
      { name: "description", content: "A luxurious trading and investment platform with instant deposits, secure withdrawals, VIP rewards and real-time dashboards." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen hero-bg">
      {/* Nav */}
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-gold)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="font-display text-lg">Premium <span className="gold-text">Traders</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Sign In</Link></Button>
          <Button asChild><Link to="/auth">Get Started</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-24 lg:pt-24 lg:pb-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs tracking-widest uppercase text-primary animate-fade-in-up">
          <Sparkles className="h-3 w-3" /> Elite Trading Experience
        </div>
        <h1 className="mt-6 font-display text-5xl md:text-7xl leading-[1.05] animate-fade-in-up">
          Trade in a <span className="gold-text">luxurious</span><br /> financial world.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground animate-fade-in-up">
          Premium Traders is a modern investment platform with instant deposits, secure withdrawals, VIP tiers and daily rewards — crafted for serious investors.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in-up">
          <Button size="lg" asChild className="animate-glow">
            <Link to="/auth">Open Your Account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" className="gold-border" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
          {[["10K+", "Active Traders"], ["99.9%", "Uptime"], ["24/7", "Support"]].map(([v, l]) => (
            <div key={l} className="glass rounded-2xl p-4">
              <div className="font-display text-2xl gold-text">{v}</div>
              <div className="text-xs text-muted-foreground mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: "Bank-Grade Security", desc: "Encrypted sessions, row-level access, and admin oversight on every transaction." },
            { icon: Zap, title: "Instant Deposits", desc: "Bank, JazzCash, EasyPaisa & USDT — approved in minutes." },
            { icon: Crown, title: "VIP Rewards", desc: "Level up as you invest and unlock exclusive daily reward bonuses." },
            { icon: LineChart, title: "Real-Time Dashboard", desc: "Live wallet balance, transaction history and market-inspired visuals." },
            { icon: Wallet, title: "Flexible Withdrawals", desc: "Withdraw to your preferred method with full transparency." },
            { icon: TrendingUp, title: "Elite Support", desc: "White-glove assistance from a dedicated team, whenever you need it." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6 hover:-translate-y-0.5 transition">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="glass-strong rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl">Ready to trade in <span className="gold-text">gold standard</span>?</h2>
            <p className="mt-3 text-muted-foreground">Create your Premium Traders account in seconds.</p>
            <Button size="lg" className="mt-6" asChild>
              <Link to="/auth">Get Started Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Premium Traders. All rights reserved.
      </footer>
    </div>
  );
}
