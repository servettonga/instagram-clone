interface SearchIconProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export const SearchIcon = ({
  width = 18,
  height = 18,
  className,
  color,
}: SearchIconProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color ?? 'currentColor'}
    strokeWidth="2"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export default SearchIcon;
