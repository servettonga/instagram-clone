import React from 'react';

interface BookmarkSimpleIconProps {
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
}

const BookmarkSimpleIcon: React.FC<BookmarkSimpleIconProps> = ({
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
      fill="currentColor"
      className={className}
    >
      <title>Saved</title>
      <path
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M20 21 12 13.44 4 21 4 3 20 3 20 21z"
      />
    </svg>
  );
};

export default BookmarkSimpleIcon;
