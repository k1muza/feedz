import { ReactNode } from 'react';

type DesignPlaceholderProps = {
  label: string;
  className?: string;
  strong?: boolean;
  compact?: boolean;
  labelPosition?: 'top' | 'bottom';
  children?: ReactNode;
};

export default function DesignPlaceholder({
  label,
  className = '',
  strong = false,
  compact = false,
  labelPosition = 'bottom',
  children,
}: DesignPlaceholderProps) {
  return (
    <div className={`fs-placeholder ${strong ? 'fs-placeholder--strong' : ''} ${compact ? 'fs-placeholder--compact' : ''} ${className}`}>
      <span className={`fs-placeholder__label ${labelPosition === 'top' ? 'fs-placeholder__label--top' : ''}`}>{label}</span>
      {children}
    </div>
  );
}
