interface VideoCallIconProps {
  width?: number;
  height?: number;
  className?: string;
}

export const VideoCallIcon = ({
  width = 24,
  height = 25,
  className,
}: VideoCallIconProps) => (
  <svg width={width} height={height} viewBox="0 0 24 25" fill="none" className={className}>
  <path d="M14.999 3.5H4C2.34315 3.5 1 4.84315 1 6.5V18.5C1 20.1569 2.34315 21.5 4 21.5H14.999C16.6559 21.5 17.999 20.1569 17.999 18.5V6.5C17.999 4.84315 16.6559 3.5 14.999 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M17.999 9.64605L20.494 7.39005C20.7093 7.19537 20.9765 7.06734 21.2632 7.02151C21.5498 6.97567 21.8436 7.01399 22.1089 7.13181C22.3742 7.24964 22.5996 7.44191 22.7578 7.6853C22.9159 7.9287 23.0001 8.21277 23 8.50305V16.497C23.0001 16.7873 22.9159 17.0714 22.7578 17.3148C22.5996 17.5582 22.3742 17.7505 22.1089 17.8683C21.8436 17.9861 21.5498 18.0244 21.2632 17.9786C20.9765 17.9328 20.7093 17.8047 20.494 17.61L18 15.354" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default VideoCallIcon;
