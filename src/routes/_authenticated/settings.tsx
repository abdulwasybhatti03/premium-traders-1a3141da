import { createFileRoute } from "@tanstack/react-router";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun, Palette, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Premium Traders" }] }),
  component: SettingsPage,
});

const THEMES: { id: Theme; label: string; swatch: string; icon: any }[] = [
  { id: "dark", label: "Midnight Gold", swatch: "linear-gradient(135deg,#0d0d10,#c9a24a)", icon: Moon },
  { id: "light", label: "Ivory Light", swatch: "linear-gradient(135deg,#fafaf7,#c9a24a)", icon: Sun },
  { id: "midnight", label: "Midnight Blue", swatch: "linear-gradient(135deg,#0d1b3d,#5eaaff)", icon: Sparkles },
  { id: "emerald", label: "Emerald Green", swatch: "linear-gradient(135deg,#062b1e,#2dd4a4)", icon: Palette },
];

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 animate-fade-in-up max-w-3xl">
      <h1 className="font-display text-3xl">Settings</h1>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg mb-4">Appearance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map(({ id, label, swatch, icon: Icon }) => (
            <button key={id} onClick={() => setTheme(id)}
              className={cn(
                "rounded-xl p-3 text-left border transition",
                theme === id ? "gold-border bg-primary/10" : "border-border hover:bg-secondary",
              )}>
              <div className="h-16 w-full rounded-lg mb-3" style={{ background: swatch }} />
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-3.5 w-3.5" /> {label}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-lg">Language</h2>
        <p className="text-sm text-muted-foreground">English is enabled. Additional languages coming soon.</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled>English</Button>
          <Button variant="ghost" disabled>اردو (soon)</Button>
        </div>
      </section>

      <section className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-lg">Security</h2>
        <p className="text-sm text-muted-foreground">Two-factor authentication is coming soon. Change your password from the auth page.</p>
      </section>
    </div>
  );
}
