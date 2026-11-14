import type { OverviewCardData, StatusLevel } from './types';
import { STATUS_COLOR } from './data';

const STATUS_TEXT: Record<StatusLevel, string> = {
  nominal: 'Nominal',
  caution: 'Caution',
  critical: 'Critical',
};

export function StatusDot({ status, className = '' }: { status: StatusLevel; className?: string }) {
  return (
    <span
      role="img"
      aria-label={STATUS_TEXT[status]}
      className={`inline-block h-2 w-2 rounded-full ${className}`}
      style={{ background: STATUS_COLOR[status], boxShadow: `0 0 8px ${STATUS_COLOR[status]}` }}
    />
  );
}

export function StatusBadge({ status, label }: { status: StatusLevel; label?: string }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: c, borderColor: `${c}66`, background: `${c}14` }}
    >
      <StatusDot status={status} />
      {label ?? STATUS_TEXT[status]}
    </span>
  );
}

function OverviewCard({ card }: { card: OverviewCardData }) {
  const c = STATUS_COLOR[card.status];
  return (
    <article className="relative overflow-hidden rounded-xl border border-cyan-400/15 bg-slate-900/60 p-4 backdrop-blur transition hover:border-cyan-400/40">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">{card.label}</h3>
        <StatusBadge status={card.status} />
      </div>
      <p className="mt-3 flex items-baseline gap-1 text-3xl font-semibold text-white">
        {card.value}
        {card.unit && <span className="font-mono text-sm text-slate-400">{card.unit}</span>}
      </p>
      <p className="mt-1 font-mono text-[11px] text-slate-400">{card.caption}</p>
      <div
        className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={card.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${card.label} score`}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${card.score}%`, background: c, boxShadow: `0 0 8px ${c}` }}
        />
      </div>
    </article>
  );
}

export function HealthOverviewCards({ cards }: { cards: OverviewCardData[] }) {
  return (
    <section aria-label="Mission health overview">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">Mission Health Overview</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">CDR S. Vance · xEMU-04</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <OverviewCard key={c.id} card={c} />
        ))}
      </div>
    </section>
  );
}

export default HealthOverviewCards;