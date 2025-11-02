interface MoreIconProps {
  width?: number;
  height?: number;
  className?: string;
  /** fill color for the dots (default currentColor) */
  fill?: string;
  /** color alias for stroke/fill */
  color?: string;
}

export const MoreIcon = ({
  width = 24,
  height = 24,
  className,
  fill,
  color,
}: MoreIconProps) => {
  const fillColor = fill ?? color ?? 'currentColor';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={fillColor}
      className={className}
    >
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  );
};

export default MoreIcon;
