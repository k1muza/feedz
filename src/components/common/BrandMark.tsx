import { cn } from '@/lib/utils';

/**
 * The FeedSport mark: an amber square turned 45°, shown beside the "FeedSport" wordmark.
 * Decorative, so the surrounding link or heading carries the accessible name.
 * Size comes from `className` (h-/w- utilities) so callers keep their responsive sizing.
 */
export function BrandMark({ className, color = '#d99a2b' }: { className?: string; color?: string }) {
  return <span aria-hidden="true" className={cn('inline-block shrink-0 rotate-45 rounded-[2px]', className)} style={{ background: color }} />;
}
