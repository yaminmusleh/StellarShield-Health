import { lazy, Suspense, useState } from 'react';
import type { OrganId } from './types';
import { ORGANS, OVERVIEW_CARDS } from './data';
import { HealthOverviewCards } from './HealthOverviewCards';
import { TelemetryTimeline } from './TelemetryTimeline';
import { OrganPanel } from './OrganPanel';
import { AITelemetryPanel } from './AITelemetryPanel';

// Three.js is heavy: keep it out of the main bundle.
const AnatomyViewer = lazy(() => import('./AnatomyViewer'));

function ViewerSkeleton() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-cyan-400/20 bg-slate-950/60">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/70">Initializing 3D engine…</p>
    </div>
  );
}

export default function InteractiveAnatomy() {
  const [selected, setSelected] = useState<OrganId | null>('heart');
  const organ = selected ? ORGANS[selected] : null;
  // Timeline always has something to show.
  const timelineOrgan = organ ?? ORGANS.heart;

  return (
    <main className="min-h-full bg-[#050b18] bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.08),transparent_60%)] p-4 text-slate-100 sm:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            ORBIT OS · Health Monitoring
          </p>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Interactive Anatomy</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Explore crew physiology in 3D, correlate organ systems with NASA human-research hazards, and review
            ORBIT AI forecasts.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          Telemetry link nominal
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT: 3D viewer */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Suspense fallback={<ViewerSkeleton />}>
            <AnatomyViewer selected={selected} onSelect={setSelected} className="h-[560px] lg:sticky lg:top-4 lg:h-[calc(100vh-9rem)] lg:min-h-[560px]" />
          </Suspense>
        </div>

        {/* CENTER: overview + timeline */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7 xl:col-span-5">
          <HealthOverviewCards cards={OVERVIEW_CARDS} />
          <TelemetryTimeline organ={timelineOrgan} />
          <div className="xl:hidden">
            <AITelemetryPanel organ={organ} />
          </div>
        </div>

        {/* RIGHT: organ panel + AI */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-12 xl:col-span-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
            <OrganPanel organ={organ} />
            <div className="hidden xl:block">
              <AITelemetryPanel organ={organ} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}