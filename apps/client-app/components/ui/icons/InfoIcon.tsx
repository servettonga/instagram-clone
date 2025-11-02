interface InfoIconProps {
  width?: number;
  height?: number;
  className?: string;
}

export const InfoIcon = ({
  width = 24,
  height = 25,
  className,
}: InfoIconProps) => (
  <svg width={width} height={height} viewBox="0 0 24 25" fill="none" className={className}>
  <path d="M12.001 23.005C17.8 23.005 22.501 18.304 22.501 12.505C22.501 6.70602 17.8 2.005 12.001 2.005C6.20199 2.005 1.50098 6.70602 1.50098 12.505C1.50098 18.304 6.20199 23.005 12.001 23.005Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M11.8188 9.45898C12.5092 9.45898 13.0688 8.89934 13.0688 8.20898C13.0688 7.51863 12.5092 6.95898 11.8188 6.95898C11.1285 6.95898 10.5688 7.51863 10.5688 8.20898C10.5688 8.89934 11.1285 9.45898 11.8188 9.45898Z" fill="currentColor"/>
  <path d="M10.5688 17.277H13.4318" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M10.5688 11.55H11.9998V17.277" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default InfoIcon;
