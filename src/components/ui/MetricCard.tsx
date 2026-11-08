import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  footerLabel?: string;
  footerValue?: string;
  progressPercent?: number;
  progressLabel?: string;
  badge?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon,
  iconBg = 'bg-surface-container',
  iconColor = 'text-primary',
  footerLabel,
  footerValue,
  progressPercent,
  progressLabel,
  badge,
  className = '',
}) => {
  return (
    <div className={`flex flex-col justify-between p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/70 shadow-sm ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">{label}</span>
        <span className={`p-2 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
          {icon}
        </span>
      </div>

      {/* Numerical Value */}
      <div className="mt-space-sm">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`font-headline-lg text-primary font-bold tracking-tight break-words ${typeof value === 'string' && value.length > 8 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-headline-lg'}`}>{value}</span>
          {unit && <span className="font-label-sm text-label-sm text-secondary font-semibold">{unit}</span>}
        </div>
        {subtext && (
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-1">
            {subtext}
          </p>
        )}
        {badge && <div className="mt-2">{badge}</div>}
      </div>

      {/* Progress Bar (Optional) */}
      {progressPercent !== undefined && (
        <div className="mt-space-sm flex flex-col gap-1">
          {progressLabel && (
            <div className="flex justify-between font-label-sm text-label-sm text-outline">
              <span>{progressLabel}</span>
              <span>{progressPercent}%</span>
            </div>
          )}
          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Context Footer (Optional) */}
      {footerLabel && footerValue && (
        <div className="mt-space-sm pt-2 bg-surface-container-low rounded-lg p-2 flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{footerLabel}</span>
          <span className="font-label-sm text-label-sm text-primary font-medium">{footerValue}</span>
        </div>
      )}
    </div>
  );
};

