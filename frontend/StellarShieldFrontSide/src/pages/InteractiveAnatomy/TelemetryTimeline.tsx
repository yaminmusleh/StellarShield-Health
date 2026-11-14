import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OrganRecord } from './types';
import { buildTimeline } from './data';

export function TelemetryTimeline({ organ }: { organ: OrganRecord }) {
  const data = useMemo(() => buildTimeline(organ.metrics), [organ]);
  const right = organ.metrics.find((m) => m.axis === 'right');

  return (
    <section
      aria-label={`${organ.name} telemetry timeline`}
      className="rounded-2xl border border-cyan-400/15 bg-slate-900/60 p-4 backdrop-blur"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
            Organ Telemetry Timeline
          </h2>
          <p className="mt-0.5 text-base font-semibold text-white">
            {organ.name} <span className="font-mono text-xs font-normal text-slate-400">· 6h mission span</span>
          </p>
        </div>
        <span className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200">
          Live mesh
        </span>
      </div>

      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#1e3a52" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={{ stroke: '#1e3a52' }} />
            <YAxis
              yAxisId="left"
              domain={['auto', 'auto']}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={['auto', 'auto']}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              width={44}
              hide={!right}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(5,11,24,0.95)',
                border: '1px solid rgba(34,211,238,0.35)',
                borderRadius: 8,
                fontFamily: 'monospace',
                fontSize: 11,
              }}
              labelStyle={{ color: '#67e8f9' }}
              labelFormatter={(l) => `MET +${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', paddingTop: 6 }} iconType="plainline" />
            {organ.metrics.map((m) => (
              <Line
                key={m.key}
                yAxisId={m.axis}
                type="monotone"
                dataKey={m.key}
                name={`${m.label} (${m.unit})`}
                stroke={m.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: m.color, fill: '#050b18' }}
                isAnimationActive
                animationDuration={600}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default TelemetryTimeline;