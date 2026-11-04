import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-surface-container-high/60 rounded ${className}`}
      aria-hidden="true"
    />
  );
};

export const ListingCardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 overflow-hidden flex flex-col p-4 space-y-3">
      <Skeleton className="w-full h-44 rounded-lg" />
      <div className="flex items-center justify-between">
        <Skeleton className="w-20 h-5 rounded-full" />
        <Skeleton className="w-16 h-4" />
      </div>
      <Skeleton className="w-3/4 h-5" />
      <Skeleton className="w-1/2 h-4" />
      <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-20 h-3" />
        </div>
        <Skeleton className="w-16 h-7 rounded-lg" />
      </div>
    </div>
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/50 space-y-2">
      <div className="flex justify-between items-center">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-6 h-6 rounded-md" />
      </div>
      <Skeleton className="w-28 h-8" />
      <Skeleton className="w-36 h-3" />
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => {
  return (
    <tr className="border-b border-outline-variant/30">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
};

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLink?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionLink,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-outline-variant rounded-xl bg-surface-container-low/40 max-w-lg mx-auto my-6">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary mb-3">
          {icon}
        </div>
      )}
      <h3 className="font-title-sm text-on-surface font-semibold text-lg mb-1">{title}</h3>
      <p className="font-body-md text-on-surface-variant text-sm max-w-sm mb-5">{description}</p>
      {actionLabel && (
        actionLink ? (
          <a
            href={actionLink}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors"
          >
            {actionLabel}
          </a>
        ) : (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
};
