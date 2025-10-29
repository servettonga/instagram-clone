import React from 'react';

interface ChevronRightIconProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

const ChevronRightIcon: React.FC<ChevronRightIconProps> = ({
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
      <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default ChevronRightIcon;
