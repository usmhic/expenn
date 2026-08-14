import { Camera, Check, Plane, Receipt, Wifi, BatteryFull, Signal } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/* Phone mockup with animated receipt scan + categorize */
export function TravelerMockup() {
  const { lang } = useI18n();
  const merchant = lang === "es" ? "Hotel Marítimo" : "Hilton Garden Inn";
  const trip = lang === "es" ? "Viaje · Madrid" : "Trip · Berlin";
  const status = lang === "es" ? "Aprobado" : "Approved";
  const sub = lang === "es" ? "Reembolsado en 2 días" : "Reimbursed in 2 days";

  return (
    <div className="relative mx-auto w-[260px] sm:w-[280px] aspect-[9/19] rounded-[2.5rem] bg-ink p-2 shadow-elegant">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 h-5 w-24 bg-ink rounded-b-2xl z-20" />
      <div className="relative h-full w-full rounded-[2rem] overflow-hidden bg-gradient-to-br from-background to-secondary">
        {/* status bar */}
        <div className="flex justify-between items-center px-5 pt-3 text-[10px] text-foreground/70 font-mono">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Signal className="h-2.5 w-2.5" />
            <Wifi className="h-2.5 w-2.5" />
            <BatteryFull className="h-3 w-3" />
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">expenn</div>
          <div className="mt-0.5 text-sm font-semibold text-ink">{trip}</div>
        </div>

        {/* viewfinder with scan animation */}
        <div className="mx-4 mt-3 relative h-[140px] rounded-2xl bg-ink/90 overflow-hidden">
          <div className="absolute inset-3 border-2 border-mint/70 rounded-xl" />
          <div className="absolute inset-x-3 top-3 h-0.5 bg-gradient-to-r from-transparent via-mint to-transparent anim-scan shadow-[0_0_12px_var(--mint)]" />
          {/* faux receipt lines */}
          <div className="absolute inset-6 flex flex-col gap-1.5 opacity-40">
            <div className="h-1.5 w-2/3 bg-white/50 rounded" />
            <div className="h-1 w-1/2 bg-white/30 rounded" />
            <div className="h-1 w-3/4 bg-white/30 rounded" />
            <div className="h-1 w-2/5 bg-white/30 rounded" />
            <div className="mt-2 h-1.5 w-1/3 bg-mint/70 rounded" />
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-mint grid place-items-center shadow-mint">
            <Camera className="h-4 w-4 text-ink" />
          </div>
        </div>

        {/* recently captured card stack */}
        <div className="px-4 mt-4 space-y-2">
          <div className="glass rounded-xl p-2.5 flex items-center gap-2.5 anim-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-ink truncate">{merchant}</div>
              <div className="text-[9px] text-muted-foreground">€312.40 · {trip.split(" · ")[1]}</div>
            </div>
            <div className="h-5 w-5 rounded-full bg-mint grid place-items-center anim-check" style={{ animationDelay: "0.7s" }}>
              <Check className="h-3 w-3 text-ink" strokeWidth={3} />
            </div>
          </div>
          <div className="glass rounded-xl p-2.5 flex items-center gap-2.5 anim-slide-up" style={{ animationDelay: "0.5s" }}>
            <div className="h-8 w-8 rounded-lg bg-mint/30 grid place-items-center">
              <Plane className="h-4 w-4 text-ink" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-ink truncate">Lufthansa LH118</div>
              <div className="text-[9px] text-muted-foreground">€489.00 · {status}</div>
            </div>
            <div className="text-[9px] font-mono text-mint">+✓</div>
          </div>
        </div>

        <div className="absolute bottom-3 inset-x-4 text-center text-[9px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

/* Admin dashboard mockup with animated bars + approvals */
export function AdminMockup() {
  const { lang } = useI18n();
  const labels = lang === "es"
    ? { dash: "Panel · Finanzas", spend: "Gasto del trimestre", pending: "Pendientes", approve: "Aprobar", trips: "Viajes activos" }
    : { dash: "Dashboard · Finance", spend: "Quarter spend", pending: "Pending approvals", approve: "Approve", trips: "Active trips" };
  const bars = [38, 62, 45, 78, 55, 82, 70, 95, 60, 88, 72, 90];
  const rows = [
    { who: "Anna K.", trip: "NYC → SFO", amt: "$2,140" },
    { who: "Marc L.", trip: "Berlin → Paris", amt: "€812" },
    { who: "Yuki T.", trip: "Tokyo → Seoul", amt: "¥98,400" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[520px] rounded-2xl bg-ink p-2 shadow-elegant">
      {/* window chrome */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <span className="ml-3 text-[10px] font-mono text-white/40">app.expenn.com</span>
      </div>
      <div className="rounded-xl bg-background overflow-hidden">
        <div className="flex">
          {/* sidebar */}
          <aside className="hidden sm:block w-[110px] border-r border-border p-3 space-y-1">
            <div className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">expenn</div>
            {["Overview", "Trips", "Expenses", "Team", "Reports"].map((s, i) => (
              <div
                key={s}
                className={`text-[10px] font-medium px-2 py-1.5 rounded-md ${i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                {s}
              </div>
            ))}
          </aside>

          <div className="flex-1 p-3 sm:p-4 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{labels.dash}</div>

            {/* KPI tiles */}
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-lg p-2 bg-secondary">
                <div className="text-[9px] text-muted-foreground">{labels.spend}</div>
                <div className="text-sm font-bold text-ink">$184.2k</div>
                <div className="text-[9px] text-mint font-mono">+12.4%</div>
              </div>
              <div className="rounded-lg p-2 bg-secondary">
                <div className="text-[9px] text-muted-foreground">{labels.trips}</div>
                <div className="text-sm font-bold text-ink">47</div>
                <div className="h-1 mt-1 rounded-full bg-mint/30 overflow-hidden">
                  <div className="h-full w-2/3 bg-mint" />
                </div>
              </div>
              <div className="rounded-lg p-2 bg-primary text-primary-foreground">
                <div className="text-[9px] opacity-70">{labels.pending}</div>
                <div className="text-sm font-bold">12</div>
                <div className="text-[9px] opacity-70 font-mono">$8,420</div>
              </div>
            </div>

            {/* chart */}
            <div className="mt-3 rounded-lg bg-secondary p-2.5">
              <div className="flex items-end gap-1 h-[60px]">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-primary to-mint anim-bar"
                    style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[8px] font-mono text-muted-foreground">
                <span>JAN</span><span>APR</span><span>JUL</span><span>OCT</span>
              </div>
            </div>

            {/* approval ticker */}
            <div className="mt-3 rounded-lg border border-border overflow-hidden h-[36px] relative">
              <div className="anim-ticker">
                {[...rows, ...rows.slice(0, 1)].map((r, i) => (
                  <div key={i} className="h-9 flex items-center gap-2 px-2.5">
                    <div className="h-5 w-5 rounded-full bg-gradient-primary text-primary-foreground text-[8px] font-bold grid place-items-center">
                      {r.who[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-ink truncate">{r.who} · {r.trip}</div>
                    </div>
                    <div className="text-[10px] font-mono text-foreground">{r.amt}</div>
                    <button className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-mint text-ink">{labels.approve}</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
