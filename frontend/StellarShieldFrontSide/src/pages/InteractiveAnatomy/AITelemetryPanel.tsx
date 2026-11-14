import type { ReactNode } from 'react';
import type { OrganRecord } from './types';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{title}</h4>
      <div className="mt-1.5 text-sm text-slate-200">{children}</div>
    </div>
  );
}

function BulletList({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent}`} />
          {i}
        </li>
      ))}
    </ul>
  );
}

export function AITelemetryPanel({ organ }: { organ: OrganRecord | null }) {
  return (
    <section
      aria-label="ORBIT AI analysis"
      className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 backdrop-blur"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
          </span>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300">ORBIT AI Analysis</h2>
        </div>
        {organ && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
            Conf. {organ.ai.confidence}% · {organ.ai.horizon}
          </span>
        )}
      </div>

      {!organ ? (
        <p className="mt-4 text-sm text-slate-400">
          ORBIT AI is standing by. Select an organ to generate a summary, probable causes, prediction and
          recommendations.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <Block title="Summary">{organ.ai.summary}</Block>
          <Block title="Possible Causes">
            <BulletList items={organ.ai.causes} accent="bg-violet-300" />
          </Block>
          <Block title="Prediction">
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-100">
              {organ.ai.prediction}
            </p>
            <div
              className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800"
              role="progressbar"
              aria-label="Model confidence"
              aria-valuenow={organ.ai.confidence}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee] transition-all duration-700"
                style={{ width: `${organ.ai.confidence}%` }}
              />
            </div>
          </Block>
          <Block title="Recommendations">
            <BulletList items={organ.ai.recommendations} accent="bg-emerald-300" />
          </Block>
        </div>
      )}
    </section>
  );
}

export default AITelemetryPanel;