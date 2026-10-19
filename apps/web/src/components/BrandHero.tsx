import React from 'react';
import { useTranslation } from 'react-i18next';
import filterToxicSvg from '../assets/filter-toxic-links.svg';
import deviceOwnerSvg from '../assets/device-owner.svg';

export const BrandHero: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-col items-center text-center mt-4 mb-8 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display tracking-tight text-brand-dark leading-[1.1] mb-4">
          {t('call.heroTitle')}
          <span className="text-brand-ochre italic font-normal">{t('call.heroTitleHighlight')}</span>
        </h1>
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-center sm:items-stretch justify-center gap-8">
        <div className="w-full sm:w-auto sm:flex-[3] sm:min-w-0 flex items-center p-3 border border-brand-border rounded-2xl">
          <img
            src={filterToxicSvg}
            alt="Filter toxic links illustration"
            className="w-full h-auto select-none pointer-events-none"
            draggable={false}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-[2] sm:min-w-0 flex items-center p-3 border border-brand-border rounded-2xl">
          <img
            src={deviceOwnerSvg}
            alt="Device owner illustration"
            className="w-full h-auto select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>
    </>
  );
};
