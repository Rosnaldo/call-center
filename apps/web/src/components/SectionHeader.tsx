import React from 'react';

interface SectionHeaderProps {
  sectionNumber: string;
  title: string;
  id?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  sectionNumber,
  title,
  id = 'section-header',
}) => {
  return (
    <div
      id={`${id}-container`}
      className="flex flex-col text-left pt-6 border-t border-[#ebdcb9]/40 mt-4 select-none"
    >
      <span
        id={`${id}-section-num`}
        className="text-[#a36500] font-mono uppercase tracking-[0.15em] text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5"
      >
        — §{sectionNumber}
      </span>
      <h2
        id={`${id}-title`}
        className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-dark tracking-tight leading-tight mt-2.5 max-w-xl"
      >
        {title}
      </h2>
    </div>
  );
};
