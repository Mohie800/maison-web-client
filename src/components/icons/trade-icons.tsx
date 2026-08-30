/**
 * Trade icons, exported from Figma (iconamoon set).
 *
 * Path data is copied verbatim from the export; only the hardcoded `#6B7280`
 * stroke becomes `currentColor`, for the reason header-icons.tsx documents —
 * inlining is what lets the glyph follow the theme in dark mode.
 *
 * The frames draw this rotated a quarter turn (`651:6633`), which turns the
 * vertical arrows horizontal. `SwapHorizontal` bakes that in.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

export function Swap(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M3 8L7 4L11 8M7 4V20M21 16L17 20L13 16M17 20V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SwapHorizontal({ className = "", ...props }: IconProps) {
  return <Swap className={`-rotate-90 ${className}`} {...props} />;
}
