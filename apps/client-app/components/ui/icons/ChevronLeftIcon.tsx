import React from 'react';

interface ChevronLeftIconProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

const ChevronLeftIcon: React.FC<ChevronLeftIconProps> = ({
  width = 16,
  height = 16,
  className,
  fill = 'white'
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="none"
      className={className}
    >
      <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default ChevronLeftIcon;
