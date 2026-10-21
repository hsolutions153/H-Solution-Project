export type UrgentLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface UrgentRequest {
  id: string;
  code: string;
  device: string;
  issue: string;
  customer: string;
  time: string;
  priority: UrgentLevel;
}

export interface MetricStat {
  label: string;
  value: number;
  change?: string;
  statusText?: string;
  color: 'blue' | 'red' | 'cyan' | 'purple' | 'green';
}