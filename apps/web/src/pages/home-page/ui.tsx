/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/header/Header.tsx';
import { Footer } from '../../components/Footer.tsx';
import { SectionHeader } from '../../components/SectionHeader.tsx';
import { BrandHero } from '../../components/BrandHero.tsx';
import { ChatbotHero } from '../../components/chatbot-hero/ChatbotHero.tsx';
import { useLogout } from '../../hooks/auth/useLogout.ts';

export const HomePageUI: React.FC = () => {
  const handleLogout = useLogout();
  const { t } = useTranslation();

  return (
    <div id="home-main-view" className="flex flex-col min-h-screen font-sans bg-brand-canvas text-brand-dark">
      <Header onLogout={handleLogout} />
      <main className="max-w-[1000px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-12 flex-grow">
        <div id="home-dashboard" className="flex flex-col gap-8">

          <BrandHero />

          <SectionHeader
            sectionNumber="01"
            title={t('chatbot.section')}
            id="chatbot-section-header"
          />

          <ChatbotHero />
        </div>
      </main>
      <Footer />
    </div>
  );
};
