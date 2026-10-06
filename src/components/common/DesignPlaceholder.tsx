import { ReactNode } from 'react';
import Image from 'next/image';
import type { UnsplashImage } from '@/data/unsplashImages';

// Labels are notes for whoever sources the photo; they must never reach the public site.
const showDesignLabels = process.env.NODE_ENV === 'development';

type DesignPlaceholderProps = {
  label: string;
  className?: string;
  strong?: boolean;
  compact?: boolean;
  labelPosition?: 'top' | 'bottom';
  // When set, the photo covers the placeholder; the striped background shows while it loads.
  image?: UnsplashImage;
  sizes?: string;
  priority?: boolean;
  children?: ReactNode;
};

export default function DesignPlaceholder({
  label,
  className = '',
  strong = false,
  compact = false,
  labelPosition = 'bottom',
  image,
  sizes = '(min-width: 1024px) 33vw, 100vw',
  priority = false,
  children,
}: DesignPlaceholderProps) {
  return (
    <div className={`fs-placeholder ${strong ? 'fs-placeholder--strong' : ''} ${compact ? 'fs-placeholder--compact' : ''} ${className}`}>
      {image ? (
        <Image src={image.src} alt={image.alt} title={image.photographer ? `Photo: ${image.photographer}` : undefined} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : showDesignLabels && (
        <span className={`fs-placeholder__label ${labelPosition === 'top' ? 'fs-placeholder__label--top' : ''}`}>{label}</span>
      )}
      {children}
    </div>
  );
}
