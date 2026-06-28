import React from 'react';
import { useTranslation } from 'react-i18next';
import filterToxicSvg from '../assets/filter-toxic-links.svg';

export const BrandHero: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-col items-center text-center mt-4 mb-2 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display tracking-tight text-brand-dark leading-[1.1] mb-4">
          {t('call.heroTitle')}
          <span className="text-brand-ochre italic font-normal">{t('call.heroTitleHighlight')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted max-w-lg leading-relaxed">
          {t('call.heroDescription')}
        </p>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-2">
        <img
          src={filterToxicSvg}
          alt="Filter toxic links illustration"
          className="w-full h-auto select-none pointer-events-none"
          draggable={false}
        />
      </div>
    </>
  );
};
