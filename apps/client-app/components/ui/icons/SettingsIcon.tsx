import React from "react";

interface IconProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
  fill?: string | 'none';
}

const SettingsIcon: React.FC<IconProps> = ({
  width = 18,
  height = 18,
  className,
  color = 'currentColor',
  fill
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill={fill ?? 'none'}
    stroke={color}
    strokeWidth={2}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Settings</title>
    <circle
      cx="12"
      cy="12"
      fill="none"
      r="8.635"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    ></circle>
    <path
      d="M14.232 3.656a1.269 1.269 0 0 1-.796-.66L12.93 2h-1.86l-.505.996a1.269 1.269 0 0 1-.796.66m-.001 16.688a1.269 1.269 0 0 1 .796.66l.505.996h1.862l.505-.996a1.269 1.269 0 0 1 .796-.66M3.656 9.768a1.269 1.269 0 0 1-.66.796L2 11.07v1.862l.996.505a1.269 1.269 0 0 1 .66.796m16.688-.001a1.269 1.269 0 0 1 .66-.796L22 12.93v-1.86l-.996-.505a1.269 1.269 0 0 1-.66-.796M7.678 4.522a1.269 1.269 0 0 1-1.03.096l-1.06-.348L4.27 5.587l.348 1.062a1.269 1.269 0 0 1-.096 1.03m11.8 11.799a1.269 1.269 0 0 1 1.03-.096l1.06.348 1.318-1.317-.348-1.062a1.269 1.269 0 0 1 .096-1.03m-14.956.001a1.269 1.269 0 0 1 .096 1.03l-.348 1.06 1.317 1.318 1.062-.348a1.269 1.269 0 0 1 1.03.096m11.799-11.8a1.269 1.269 0 0 1-.096-1.03l.348-1.06-1.317-1.318-1.062.348a1.269 1.269 0 0 1-1.03-.096"
      fill="none"
      stroke={color}
      strokeLinejoin="round"
      strokeWidth="2"
    ></path>
  </svg>
);

export default SettingsIcon;
