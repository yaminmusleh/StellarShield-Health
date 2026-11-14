import type { ReactNode } from 'react';
import type { OrganRecord, RiskLevel } from './types';
import { StatusBadge } from './HealthOverviewCards';

const RISK_COLOR: Record<RiskLevel, string> = {
  Low: '#34d399',
  Moderate: '#fbbf24',
  High: '#f87171',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200">{children}</dd>
    </div>
  );
}

export function OrganPanel({ organ }: { organ: OrganRecord | null }) {
  if (!organ) {
    return (
      <aside
        aria-live="polite"
        className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/20 bg-slate-900/40 p-6 text-center"
      >
        <span className="mb-3 h-3 w-3 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_14px_#22d3ee]" />
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">Selected Organ Panel</p>
        <p className="mt-2 max-w-[22ch] text-sm text-slate-400">
          Select an organ on the model to view status, hazards and recommendations.
        </p>
      </aside>
    );
  }

  const risk = RISK_COLOR[organ.risk];

  return (
    <aside
      aria-live="polite"
      aria-label={`${organ.name} details`}
      className="rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-5 shadow-[0_0_30px_rgba(34,211,238,0.07)] backdrop-blur"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/80">Selected Organ</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">{organ.name}</h2>
          <p className="font-mono text-[11px] text-slate-400">{organ.subsystem}</p>
        </div>
        <StatusBadge status={organ.status} label={organ.statusLabel} />
      </div>

      <div className="mt-4 rounded-xl border border-cyan-400/15 bg-slate-950/60 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{organ.headline.label}</p>
        <p className="mt-1 flex items-baseline gap-1.5 text-3xl font-semibold text-cyan-200">
          {organ.headline.value}
          <span className="font-mono text-sm text-slate-400">{organ.headline.unit}</span>
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <Field label="Risk Level">
          <span
            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest"
            style={{ color: risk }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: risk, boxShadow: `0 0 8px ${risk}` }} />
            {organ.risk}
          </span>
        </Field>
        <Field label="Status">{organ.statusLabel}</Field>
        <div className="col-span-2">
          <Field label="NASA Hazard Association">
            <span className="inline-block rounded border border-violet-400/40 bg-violet-400/10 px-2 py-0.5 font-mono text-xs text-violet-200">
              {organ.hazard}
            </span>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="AI Insight">{organ.insight}</Field>
        </div>
      </dl>

      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Recommended Actions</p>
        <ul className="mt-2 space-y-1.5">
          {organ.actions.map((a) => (
            <li key={a} className="flex gap-2 text-sm text-slate-200">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default OrganPanel;