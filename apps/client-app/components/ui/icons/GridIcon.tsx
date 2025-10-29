import React from 'react';

interface GridIconProps {
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
}

const GridIcon: React.FC<GridIconProps> = ({
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
      className={className}
    >
      <title>Posts</title>
      <path
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 3H21V21H3z"
      />
      <path
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9.01486 3 9.01486 21"
      />
      <path
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M14.98514 3 14.98514 21"
      />
      <path
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M21 9.01486 3 9.01486"
      />
      <path
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M21 14.98514 3 14.98514"
      />
    </svg>
  );
};

export default GridIcon;
