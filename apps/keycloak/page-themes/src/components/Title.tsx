import React from 'react';

interface TitleProps {
  id?: string;
  className?: string;
}

export const Title: React.FC<TitleProps> = ({ 
  id = 'title', 
  className = '' 
}) => {
  return (
    <div id={`${id}-container`} className={`mt-0 mb-3 ${className}`}>
      <h1 
        id={id} 
        className="text-[42px] font-medium text-brand-dark tracking-[-0.02em] font-fraunces mb-1"
      >
        Profile
      </h1>
    </div>
  );
};
