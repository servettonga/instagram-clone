interface ShareIconProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export const ShareIcon = ({
  width = 24,
  height = 24,
  className,
  color,
}: ShareIconProps) => {
  const strokeColor = color  ?? 'currentColor';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 25 25"
      fill="none"
      className={className}
    >
      <path
        d="M22.6094 3.48438L9.82739 10.5674"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12.3074 20.8184L22.6094 3.48535H2.60938L9.82738 10.5684L12.3074 20.8184Z"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ShareIcon;
