interface MoreIconProps {
  width?: number;
  height?: number;
  className?: string;
}

export const MoreIcon = ({
  width = 24,
  height = 24,
  className,
}: MoreIconProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="6" cy="12" r="1.5" fill="currentColor" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export default MoreIcon;
