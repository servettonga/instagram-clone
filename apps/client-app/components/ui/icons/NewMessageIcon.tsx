interface NewMessageIconProps {
  width?: number;
  height?: number;
  className?: string;
}

export const NewMessageIcon = ({
  width = 24,
  height = 25,
  className,
}: NewMessageIconProps) => (
  <svg width={width} height={height} viewBox="0 0 24 25" fill="none" className={className}>
    <path d="M12.202 3.703H5.25C4.45435 3.703 3.69129 4.01907 3.12868 4.58168C2.56607 5.14429 2.25 5.90735 2.25 6.703V19.25C2.25 20.0457 2.56607 20.8087 3.12868 21.3713C3.69129 21.9339 4.45435 22.25 5.25 22.25H17.797C18.5927 22.25 19.3557 21.9339 19.9183 21.3713C20.4809 20.8087 20.797 20.0457 20.797 19.25V12.298" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.0019 17.7261H6.77393V14.4981L18.6069 2.66506C18.7385 2.53347 18.8947 2.42909 19.0666 2.35787C19.2386 2.28665 19.4228 2.25 19.6089 2.25C19.795 2.25 19.9793 2.28665 20.1512 2.35787C20.3231 2.42909 20.4793 2.53347 20.6109 2.66506L21.8349 3.89006C21.9665 4.02164 22.0709 4.17785 22.1421 4.34978C22.2133 4.5217 22.25 4.70597 22.25 4.89206C22.25 5.07815 22.2133 5.26242 22.1421 5.43434C22.0709 5.60627 21.9665 5.76248 21.8349 5.89406L10.0019 17.7261Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.8479 4.42395L20.0759 7.65295" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default NewMessageIcon;
