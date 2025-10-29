import React from 'react';

interface NavNextIconProps {
  width?: number;
  height?: number;
  className?: string;
}

const NavNextIcon: React.FC<NavNextIconProps> = ({
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
      <circle cx="15" cy="15" r="15" fillOpacity="0.8" />
      <path d="M12 9L18 15L12 21" stroke="black" strokeWidth="2" fill="none" />
    </svg>
  );
};

export default NavNextIcon;
