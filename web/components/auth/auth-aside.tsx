import { CheckCircle2, MapPin, ShieldCheck } from "lucide-react";

/** Brand panel beside the sign-in form (desktop only). */
export function AuthAside() {
  return (
    <aside className="auth-aside flex-col justify-between p-12 xl:p-16">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[oklch(0.78_0.13_172/0.35)] blur-3xl" />
      <div className="relative">
        <p className="text-sm font-medium text-white/70">Expense & travel management</p>
        <h2 className="mt-3 max-w-md font-display text-4xl font-semibold leading-tight tracking-tight">
          Plan the route. Capture the receipt. Get paid back.
        </h2>
      </div>

      <div className="relative mx-auto w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Central Europe roadshow</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">Day 3 of 8</span>
        </div>
        <svg viewBox="0 0 320 140" className="mt-4 w-full" aria-hidden>
          <path d="M30 26 C 90 40, 120 90, 150 84 S 230 70, 290 118" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="9" strokeLinecap="round" />
          <path d="M30 26 C 90 40, 120 90, 150 84 S 230 70, 290 118" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
          {[[30, 26], [150, 84], [290, 118]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="11" fill="white" />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="oklch(0.5 0.24 272)">{i + 1}</text>
            </g>
          ))}
        </svg>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          {[["721 km", "Route"], ["€1,227", "Spent"], ["€89.90", "Owed to you"]].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-white/10 px-2 py-2.5">
              <p className="text-base font-semibold">{v}</p>
              <p className="text-white/70">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <ul className="relative space-y-2.5 text-sm text-white/85">
        <li className="flex items-center gap-2.5"><MapPin className="size-4" /> Multi-stop trips on an interactive map</li>
        <li className="flex items-center gap-2.5"><CheckCircle2 className="size-4" /> One queue to approve and pay back expenses</li>
        <li className="flex items-center gap-2.5"><ShieldCheck className="size-4" /> Self-hosted: your data stays on your servers</li>
      </ul>
    </aside>
  );
}
