export type OrganId = 'brain' | 'eyes' | 'heart' | 'lungs' | 'muscles' | 'bones';

export type StatusLevel = 'nominal' | 'caution' | 'critical';
export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface TelemetryMetricSpec {
  key: string;
  label: string;
  unit: string;
  color: string;
  /** Mock-data generator parameters */
  base: number;
  amp: number;
  drift: number;
  seed: number;
  precision?: number;
  /** Which Y axis the series is plotted against */
  axis: 'left' | 'right';
}

export type TelemetryPoint = { t: string } & Record<string, string | number>;

export interface OrganAIAnalysis {
  summary: string;
  causes: string[];
  prediction: string;
  /** 0 - 100 */
  confidence: number;
  horizon: string;
  recommendations: string[];
}

export interface OrganRecord {
  id: OrganId;
  name: string;
  subsystem: string;
  status: StatusLevel;
  statusLabel: string;
  risk: RiskLevel;
  hazard: string;
  headline: { label: string; value: string; unit: string };
  insight: string;
  actions: string[];
  metrics: TelemetryMetricSpec[];
  ai: OrganAIAnalysis;
}

export interface OverviewCardData {
  id: string;
  label: string;
  value: string;
  unit?: string;
  caption: string;
  status: StatusLevel;
  /** 0 - 100 */
  score: number;
}