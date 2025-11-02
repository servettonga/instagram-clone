import React from 'react';

interface ExploreIconProps {
  width?: number;
  height?: number;
  className?: string;
  filled?: boolean;
  color?: string;
  fill?: string;
}

export const ExploreIcon = ({ width = 24, height = 24, className, filled = false, color, fill }: ExploreIconProps) =>
  filled ? (
  <svg width={width} height={height} viewBox="0 0 24 24" fill={fill ?? 'currentColor'} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="m13.173 13.164 1.491-3.829-3.83 1.49ZM12.001.5a11.5 11.5 0 1 0 11.5 11.5A11.513 11.513 0 0 0 12.001.5Zm5.35 7.443-2.478 6.369a1 1 0 0 1-.57.569l-6.36 2.47a1 1 0 0 1-1.294-1.294l2.48-6.369a1 1 0 0 1 .57-.569l6.359-2.47a1 1 0 0 1 1.294 1.294Z"/>
    </svg>
  ) : (
    <svg width={width} height={height} viewBox="0 0 25 25" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M14.4411 14.453L8.08105 16.924L10.5601 10.556L16.9201 8.08496L14.4411 14.453Z" stroke={color ?? 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.5601 10.556L14.4491 14.445L8.08105 16.924L10.5601 10.556Z" fill={fill ?? 'currentColor'}/>
      <path d="M12.501 23.005C18.3 23.005 23.001 18.304 23.001 12.505C23.001 6.70602 18.3 2.005 12.501 2.005C6.70199 2.005 2.00098 6.70602 2.00098 12.505C2.00098 18.304 6.70199 23.005 12.501 23.005Z" stroke={color ?? 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

export default ExploreIcon;
