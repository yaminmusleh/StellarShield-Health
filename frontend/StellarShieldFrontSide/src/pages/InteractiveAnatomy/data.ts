import type {
  OrganId,
  OrganRecord,
  OverviewCardData,
  TelemetryPoint,
  TelemetryMetricSpec,
} from './types';

export const ORGAN_ORDER: OrganId[] = ['brain', 'eyes', 'heart', 'lungs', 'muscles', 'bones'];

export const STATUS_COLOR = {
  nominal: '#34d399',
  caution: '#fbbf24',
  critical: '#f87171',
} as const;

export const ACCENT = '#22d3ee';

export const ORGANS: Record<OrganId, OrganRecord> = {
  brain: {
    id: 'brain',
    name: 'Brain',
    subsystem: 'Central Nervous System',
    status: 'nominal',
    statusLabel: 'Normal',
    risk: 'Low',
    hazard: 'Isolation & Confinement',
    headline: { label: 'Cognitive Index', value: '94', unit: '/100' },
    insight:
      'Reaction time and working-memory scores are within baseline. Stress load is trending slightly upward during EVA preparation.',
    actions: [
      'Maintain 8h crew sleep schedule',
      'Schedule 20 min private communication window',
      'Continue daily cognitive battery before EVA',
    ],
    metrics: [
      { key: 'cog', label: 'Cognitive Performance', unit: '%', color: '#22d3ee', base: 93, amp: 2.2, drift: 0.4, seed: 1, axis: 'left' },
      { key: 'stress', label: 'Stress Load', unit: '%', color: '#a78bfa', base: 32, amp: 5, drift: 2.5, seed: 2, axis: 'right' },
    ],
    ai: {
      summary:
        'Neurocognitive markers remain stable across the last 6 hours. Mild stress elevation correlates with EVA ingress preparation workload.',
      causes: [
        'Elevated task load during EVA preparation',
        'Extended crew confinement (MET +142d)',
        'Minor circadian drift of ~25 min',
      ],
      prediction: 'Mild fatigue risk within 48 hours if sleep debt continues to accumulate.',
      confidence: 82,
      horizon: '48h',
      recommendations: [
        'Increase sleep duration by 30 minutes',
        'Maintain hydration targets',
        'Reduce non-essential evening tasks',
      ],
    },
  },
  eyes: {
    id: 'eyes',
    name: 'Eyes',
    subsystem: 'Ocular / Visual System',
    status: 'caution',
    statusLabel: 'Monitor',
    risk: 'Moderate',
    hazard: 'Microgravity / Gravity Fields',
    headline: { label: 'Vision Health', value: '88', unit: '/100' },
    insight:
      'Slight increase in intraocular pressure consistent with cephalad fluid shift. Visor HUD usage is adding to eye strain.',
    actions: [
      'Perform scheduled OCT imaging this week',
      'Limit continuous HUD exposure to 90 min',
      'Use lower-body negative pressure protocol',
    ],
    metrics: [
      { key: 'vision', label: 'Vision Health', unit: '%', color: '#22d3ee', base: 88, amp: 1.6, drift: -1.2, seed: 3, axis: 'left' },
      { key: 'strain', label: 'Eye Strain', unit: '%', color: '#fbbf24', base: 41, amp: 6, drift: 5, seed: 4, axis: 'right' },
    ],
    ai: {
      summary:
        'Fluid-shift signature detected. Optic disc swelling indicators are below threshold but trending upward over the last 30 days.',
      causes: [
        'Headward fluid redistribution in microgravity',
        'Prolonged optical HUD tint usage',
        'Elevated CO2 exposure in sleep quarters',
      ],
      prediction: 'Moderate probability of visual acuity shift if trend persists beyond 3 weeks.',
      confidence: 74,
      horizon: '21d',
      recommendations: [
        'Schedule ophthalmic ultrasound',
        'Increase visor rest intervals',
        'Review cabin CO2 scrubber performance',
      ],
    },
  },
  heart: {
    id: 'heart',
    name: 'Heart',
    subsystem: 'Cardiovascular System',
    status: 'nominal',
    statusLabel: 'Normal',
    risk: 'Low',
    hazard: 'Cardiovascular Adaptation',
    headline: { label: 'Heart Rate', value: '68', unit: 'BPM' },
    insight: 'No current cardiovascular abnormalities detected. Rhythm and perfusion are within mission baseline.',
    actions: [
      'Continue current exercise countermeasures',
      'Maintain 2.5 L daily fluid intake',
      'Log orthostatic test after EVA',
    ],
    metrics: [
      { key: 'hr', label: 'Heart Rate', unit: 'BPM', color: '#f87171', base: 68, amp: 4, drift: 1.5, seed: 5, axis: 'left', precision: 0 },
      { key: 'spo2', label: 'Oxygen Perfusion', unit: '%', color: '#22d3ee', base: 97.6, amp: 0.5, drift: 0, seed: 6, axis: 'right', precision: 1 },
    ],
    ai: {
      summary: 'Cardiac output and rhythm are stable. Cardiovascular deconditioning indicators remain below alert thresholds.',
      causes: [
        'Reduced hydrostatic load in microgravity',
        'Regular treadmill and cycle ergometer sessions',
        'Normal EVA preparatory elevation',
      ],
      prediction: 'Low probability of arrhythmia or orthostatic intolerance over the next 7 days.',
      confidence: 91,
      horizon: '7d',
      recommendations: [
        'Continue aerobic countermeasure schedule',
        'Monitor orthostatic response post-EVA',
        'Maintain electrolyte balance',
      ],
    },
  },
  lungs: {
    id: 'lungs',
    name: 'Lungs',
    subsystem: 'Respiratory System',
    status: 'nominal',
    statusLabel: 'Normal',
    risk: 'Low',
    hazard: 'Closed Environment Risk',
    headline: { label: 'Respiratory Rate', value: '14', unit: 'br/min' },
    insight: 'Airway function is nominal. Cabin CO2 at 0.3% and particulate load are within safe limits.',
    actions: [
      'Verify scrubber filter cycle before ingress',
      'Continue spirometry check weekly',
      'Monitor cabin particulate counts',
    ],
    metrics: [
      { key: 'rr', label: 'Respiratory Rate', unit: 'br/min', color: '#22d3ee', base: 14, amp: 1.2, drift: 0.2, seed: 7, axis: 'left', precision: 0 },
      { key: 'co2', label: 'Inhaled CO2', unit: 'mmHg', color: '#34d399', base: 1.8, amp: 0.15, drift: 0.1, seed: 8, axis: 'right', precision: 2 },
    ],
    ai: {
      summary: 'Lung function metrics remain stable. Closed-environment air quality is within acceptable bounds.',
      causes: [
        'Stable scrubber efficiency (99.4%)',
        'Low airborne particulate counts',
        'Consistent humidity regulation',
      ],
      prediction: 'No respiratory degradation expected within the next 14 days.',
      confidence: 88,
      horizon: '14d',
      recommendations: [
        'Replace HEPA filters on schedule',
        'Continue breathing exercises',
        'Track CO2 near sleep quarters',
      ],
    },
  },
  muscles: {
    id: 'muscles',
    name: 'Muscles',
    subsystem: 'Musculoskeletal - Muscle',
    status: 'caution',
    statusLabel: 'Monitor',
    risk: 'Moderate',
    hazard: 'Microgravity',
    headline: { label: 'Muscle Mass Index', value: '96.1', unit: '%' },
    insight: 'Slight atrophy trend in lower-limb muscle groups. Resistive exercise compliance is at 94%.',
    actions: [
      'Complete ARED resistive session today',
      'Increase protein intake by 10%',
      'Add calf-raise protocol',
    ],
    metrics: [
      { key: 'mass', label: 'Muscle Mass Index', unit: '%', color: '#22d3ee', base: 96, amp: 0.4, drift: -0.9, seed: 9, axis: 'left', precision: 1 },
      { key: 'fatigue', label: 'Fatigue Load', unit: '%', color: '#fbbf24', base: 38, amp: 5, drift: 3, seed: 10, axis: 'right' },
    ],
    ai: {
      summary: 'Lower-limb muscle volume is trending 1.2% below pre-flight baseline, within expected microgravity adaptation.',
      causes: [
        'Reduced weight-bearing loads',
        'Missed resistive session on MET +139d',
        'Elevated EVA workload',
      ],
      prediction: 'Strength reduction of ~1.5% likely by end of mission month if compliance dips.',
      confidence: 79,
      horizon: '30d',
      recommendations: [
        'Maintain 6x weekly resistive exercise',
        'Increase protein intake',
        'Add eccentric loading routines',
      ],
    },
  },
  bones: {
    id: 'bones',
    name: 'Bones',
    subsystem: 'Skeletal System',
    status: 'caution',
    statusLabel: 'Monitor',
    risk: 'Moderate',
    hazard: 'Bone Density Loss',
    headline: { label: 'Bone Density', value: '97.2', unit: '%' },
    insight: 'Lumbar and hip density show a gradual decline of about 1% per month, consistent with microgravity exposure.',
    actions: [
      'Continue ARED loading protocol',
      'Verify vitamin D and calcium supplementation',
      'Schedule DXA review at next window',
    ],
    metrics: [
      { key: 'bmd', label: 'Bone Density', unit: '%', color: '#22d3ee', base: 97.2, amp: 0.15, drift: -0.7, seed: 11, axis: 'left', precision: 1 },
      { key: 'turnover', label: 'Bone Turnover', unit: '%', color: '#a78bfa', base: 44, amp: 4, drift: 3, seed: 12, axis: 'right' },
    ],
    ai: {
      summary: 'Bone mineral density is declining at a rate consistent with long-duration spaceflight and is being mitigated by countermeasures.',
      causes: [
        'Absence of axial loading in microgravity',
        'Elevated bone-turnover markers',
        'Reduced vitamin D synthesis',
      ],
      prediction: 'Hip BMD may drop below the 95% advisory threshold in approximately 60 days.',
      confidence: 76,
      horizon: '60d',
      recommendations: [
        'Increase ARED loading intensity',
        'Review supplementation protocol',
        'Plan post-mission rehabilitation',
      ],
    },
  },
};

export const OVERVIEW_CARDS: OverviewCardData[] = [
  { id: 'overall', label: 'Overall Health Score', value: '92', unit: '/100', caption: 'Mission baseline: 90', status: 'nominal', score: 92 },
  { id: 'cognitive', label: 'Cognitive Status', value: 'Stable', caption: 'Stress load trending up', status: 'nominal', score: 94 },
  { id: 'cardio', label: 'Cardiovascular Status', value: 'Normal', caption: 'HR 68 BPM / SpO2 97.6%', status: 'nominal', score: 95 },
  { id: 'msk', label: 'Musculoskeletal Status', value: 'Monitor', caption: 'Bone + muscle loss trend', status: 'caution', score: 78 },
];

/* ----- deterministic mock telemetry ----- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds a 6-hour (13 points, 30-min step) series for the given metric specs. */
export function buildTimeline(specs: TelemetryMetricSpec[], points = 13): TelemetryPoint[] {
  const rands = specs.map((s) => mulberry32(s.seed * 9973));
  return Array.from({ length: points }, (_, i) => {
    const mins = i * 30;
    const label = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    const row: TelemetryPoint = { t: label };
    specs.forEach((s, idx) => {
      const noise = (rands[idx]() - 0.5) * 2 * s.amp;
      const wave = Math.sin((i / (points - 1)) * Math.PI * 2 + s.seed) * s.amp * 0.5;
      const trend = (i / (points - 1)) * s.drift;
      const v = s.base + noise * 0.6 + wave + trend;
      const p = s.precision ?? 1;
      row[s.key] = Number(v.toFixed(p));
    });
    return row;
  });
}