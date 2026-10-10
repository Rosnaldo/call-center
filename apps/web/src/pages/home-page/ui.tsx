/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/header/Header.tsx';
import { Footer } from '../../components/Footer.tsx';
import { SectionHeader } from '../../components/SectionHeader.tsx';
import { BrandHero } from '../../components/BrandHero.tsx';
import { ChatbotHero } from '../../components/chatbot-hero/ChatbotHero.tsx';
import { useLogout } from '../../hooks/auth/useLogout.ts';
import { CallLobbyView } from '../../components/call-lobby-view/call-view/CallLobbyView.tsx';
import { AttendantList } from '../../components/user-list/AttendantList.tsx';
import { useOnlineUsersStore } from '../../states/stores.ts';
import { openPublicAttendants } from '../../services/sse/public-attendants.ts';

export const HomePageUI: React.FC = () => {
  const handleLogout = useLogout();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const users = useOnlineUsersStore((s) => s.users);

  // Visitors aren't logged in, so the attendants come from realtime's public
  // stream (names and status only); calling one needs a login.
  useEffect(() => openPublicAttendants(useOnlineUsersStore), []);

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

          <SectionHeader
            sectionNumber="02"
            title={t('call.lobbySection')}
            id="lobby-section-header"
          />

          <CallLobbyView />

          <SectionHeader
            sectionNumber="03"
            title={t('call.placeCallSection')}
            id="call-section-header"
          />

          <AttendantList
            users={users}
            currentUser={null}
            call={null}
            onCompleteCall={() => {}}
            onLoginToCall={() => navigate('/login')}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};
