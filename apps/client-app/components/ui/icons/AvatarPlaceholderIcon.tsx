import React from 'react';

interface AvatarPlaceholderIconProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

const AvatarPlaceholderIcon: React.FC<AvatarPlaceholderIconProps> = ({
  width = 44,
  height = 44,
  className,
  fill = '#C4C4C4'
}) => {
  return (
    <svg
      width={width + 0.5}
      height={height}
      viewBox={`0 0 ${width + 0.5} ${height}`}
      fill="none"
      className={className}
    >
      <rect x="0.5" width={width} height={height} rx={height / 2} fill={fill}/>
    </svg>
  );
};

export default AvatarPlaceholderIcon;
