interface CloseIconProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export const CloseIcon = ({
  width = 16,
  height = 16,
  className,
  color,
}: CloseIconProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color ?? 'currentColor'}
    strokeWidth="2"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default CloseIcon;
