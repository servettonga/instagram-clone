import React from 'react';

interface NavPrevIconProps {
  width?: number;
  height?: number;
  className?: string;
}

const NavPrevIcon: React.FC<NavPrevIconProps> = ({
  width = 30,
  height = 30,
  className
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 30 30"
      fill="white"
      className={className}
    >
      <circle cx="15" cy="15" r="15" fillOpacity="0.4" />
      <path d="M18 9L12 15L18 21" stroke="black" strokeWidth="2" fill="none" />
    </svg>
  );
};

export default NavPrevIcon;
