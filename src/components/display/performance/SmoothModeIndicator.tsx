import type { AdaptiveQualityLevel } from "@/lib/display-performance/adaptive-quality";

export interface SmoothModeIndicatorProps {
  quality?: AdaptiveQualityLevel;
  active?: boolean;
  label?: string;
  className?: string;
}

/**
 * Optional owner-facing status. It renders nothing at full quality, so a
 * display can compose it in its operator status cluster without exposing a
 * technical message to the public room.
 */
export function SmoothModeIndicator({
  quality = "full",
  active = quality !== "full",
  label = "Smooth mode",
  className,
}: SmoothModeIndicatorProps) {
  if (!active) return null;
  return (
    <span
      className={className}
      data-testid="smooth-mode-indicator"
      data-quality={quality}
      role="status"
      aria-live="polite"
      aria-label={`${label} is active`}
    >
      {label}
    </span>
  );
}
