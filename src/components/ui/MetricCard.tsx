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
    <div className={`flex flex-col justify-between p-5 sm:p-6 bg-white rounded-[18px] border border-[#E8E4DA] shadow-[0_2px_8px_rgba(16,61,42,0.03)] hover:shadow-card-hover transition-all ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="font-sans text-[11px] font-bold text-[#6F776F] uppercase tracking-wider">{label}</span>
        <span className={`w-9 h-9 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shadow-xs`}>
          {icon}
        </span>
      </div>

      {/* Numerical Value */}
      <div className="mt-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`font-heading font-bold text-[#18251F] tracking-tight break-words ${typeof value === 'string' && value.length > 8 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>{value}</span>
          {unit && <span className="font-sans text-xs text-[#315F3B] font-semibold">{unit}</span>}
        </div>
        {subtext && (
          <p className="font-sans text-xs text-[#6F776F] mt-1 line-clamp-1">
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

