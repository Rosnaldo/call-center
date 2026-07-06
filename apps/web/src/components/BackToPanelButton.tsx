/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

interface BackToPanelButtonProps {
  className?: string;
}

export const BackToPanelButton: React.FC<BackToPanelButtonProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/painel')}
      className={`group flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-brand-ochre transition-colors cursor-pointer ${className}`}
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      {t('common.backToPanel')}
    </button>
  );
};
