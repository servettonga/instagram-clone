interface MessagePlaneIconProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export const MessagePlaneIcon = ({
  width = 96,
  height = 97,
  className,
  color,
}: MessagePlaneIconProps) => {
  const strokeColor = color ?? 'currentColor';

  return (
    <div style={{ width, height, position: 'relative' }} className={className}>
      <div style={{ left: 1, top: 1, position: 'absolute' }}>
        <svg width={width} height={width + 1} viewBox="0 0 96 97" fill="none">
          <path d="M48 95.5C73.9574 95.5 95 74.4574 95 48.5C95 22.5426 73.9574 1.5 48 1.5C22.0426 1.5 1 22.5426 1 48.5C1 74.4574 22.0426 95.5 48 95.5Z" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ left: width * 0.43, top: width * 0.34, position: 'absolute' }}>
        <svg width={width * 0.31} height={width * 0.20} viewBox="0 0 30 19" fill="none">
          <path d="M29.2858 1.70996L1.44678 17.304" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ left: width * 0.26, top: width * 0.33, position: 'absolute' }}>
        <svg width={width * 0.52} height={width * 0.46} viewBox="0 0 50 44" fill="none">
          <path d="M24.2539 42.623L48.3759 1.49805L1.5459 1.50205L18.4479 18.305L24.2539 42.623Z" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
};

export default MessagePlaneIcon;
