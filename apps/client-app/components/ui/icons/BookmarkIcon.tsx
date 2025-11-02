interface BookmarkIconProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
  filled?: boolean;
  fill?: string;
}

export const BookmarkIcon = ({
  width = 24,
  height = 24,
  className,
  color,
  filled = false,
  fill,
}: BookmarkIconProps) => {
  const strokeColor = color ?? 'currentColor';
  const fillColor = fill ?? strokeColor;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 25 25"
      fill={filled ? fillColor : 'none'}
      className={className}
    >
      <path
        d="M20.6094 21.4844L12.6094 13.9244L4.60938 21.4844V3.48438H20.6094V21.4844Z"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BookmarkIcon;
