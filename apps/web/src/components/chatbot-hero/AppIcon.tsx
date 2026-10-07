import React, { useState } from 'react';

interface AppIconProps {
  // Google Play icon URL.
  url: string;
  // Its first letter stands in when the image can't load.
  name: string;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ url, name, className = 'w-8 h-8' }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={`shrink-0 rounded-[9px] flex items-center justify-center bg-[#F5EFE4] text-[#857967] text-[13px] font-bold ${className}`}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-[9px] object-cover bg-[#F5EFE4] ${className}`}
    />
  );
};

export default AppIcon;
