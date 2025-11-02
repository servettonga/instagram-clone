import React from 'react';

interface ChevronDownIconProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

const ChevronDownIcon: React.FC<ChevronDownIconProps> = ({
  width = 12,
  height = 12,
  className,
  fill = 'currentColor'
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 12 12"
      transform="rotate(180)"
      className={className}
    >
      <path d="M1 4.5L6 9.5L11 4.5" fill={fill}/>
    </svg>
  );
};

export default ChevronDownIcon;
