import React from 'react';

interface BackArrowIconProps {
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
}

const BackArrowIcon: React.FC<BackArrowIconProps> = ({
  width = 24,
  height = 24,
  className,
  stroke = 'currentColor'
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      className={className}
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
};

export default BackArrowIcon;
