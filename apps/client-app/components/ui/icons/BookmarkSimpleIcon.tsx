import React from "react";

interface BookmarkSimpleIconProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

const BookmarkSimpleIcon: React.FC<BookmarkSimpleIconProps> = ({
  width = 24,
  height = 24,
  className,
  color,
}) => {
  const strokeColor = color ?? 'currentColor';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke={strokeColor}
      strokeWidth="2"
    >
      <title>Saved</title>
      <polygon
        fill="none"
        points="20 21 12 13.44 4 21 4 3 20 3 20 21"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      ></polygon>
    </svg>
  );
};

export default BookmarkSimpleIcon;
