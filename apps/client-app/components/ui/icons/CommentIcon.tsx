interface CommentIconProps {
  width?: number;
  height?: number;
  className?: string;
  filled?: boolean;
  /** fill color for filled variant */
  fill?: string;
  /** stroke color for outlined variant */
  color?: string;
}

export const CommentIcon = ({
  width = 24,
  height = 24,
  className,
  filled = false,
  fill = 'currentColor',
  color,
}: CommentIconProps) => {
  const strokeColor = color ?? fill;

  return (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className}>
      {filled ? (
        // Filled comment (simple solid path)
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          fill={fill}
        />
      ) : (
        // Outline comment
        <path
          d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z"
          fill="none"
          stroke={strokeColor}
          strokeLinejoin="round"
          strokeWidth="2"
        />
      )}
    </svg>
  );
};

export default CommentIcon;
