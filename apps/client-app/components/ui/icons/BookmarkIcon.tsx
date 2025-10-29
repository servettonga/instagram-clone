interface BookmarkIconProps {
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
  filled?: boolean;
}

export const BookmarkIcon = ({
  width = 24,
  height = 24,
  className,
  stroke = '#262626',
  filled = false,
}: BookmarkIconProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 25 25"
    fill={filled ? stroke : 'none'}
    className={className}
  >
    <path
      d="M20.6094 21.4844L12.6094 13.9244L4.60938 21.4844V3.48438H20.6094V21.4844Z"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default BookmarkIcon;
