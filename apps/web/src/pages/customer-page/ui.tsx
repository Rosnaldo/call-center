/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/header/Header.tsx';
import { Footer } from '../../components/Footer.tsx';
import { StoreBoard } from '../../components/store-board/StoreBoard.tsx';
import { CallLobbyView } from '../../components/call-lobby-view/call-view/CallLobbyView.tsx';
import { UserListsContainer } from '../../components/user-list/UserListsContainer.tsx';
import { SectionHeader } from '../../components/SectionHeader.tsx';
import { CallState } from '@/src/states/call/state.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';
import { BrandHero } from '../../components/BrandHero.tsx';
import { useLogout } from '../../hooks/auth/useLogout.ts';

interface CustomerPageUIProps {
  currentUser: OnlineUserState | null;
  users: OnlineUserState[];
  call: CallState | null;
  completeCall: (attendantId: string, callId?: string, byAttendant?: boolean) => void;
}

export const CustomerPageUI: React.FC<CustomerPageUIProps> = ({
  currentUser,
  users,
  call,
  completeCall,
}) => {
  const handleLogout = useLogout();
  const { t } = useTranslation();

  return (
    <div id="customer-main-view" className="flex flex-col min-h-screen font-sans bg-brand-canvas text-brand-dark">
      <Header users={users} onLogout={handleLogout} />
      <main className="max-w-[1000px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-12 flex-grow">
        {/* CUSTOMER DASHBOARD */}
        <div id="customer-active-dashboard" className="flex flex-col gap-8">

          <BrandHero />

          <div className="flex flex-col gap-8">
            <SectionHeader
              sectionNumber="01"
              title={t('call.lobbySection')}
              id="lobby-section-header"
            />

            {/* Connected Meet or Queue Progression */}
            <CallLobbyView />

            <SectionHeader
              sectionNumber="02"
              title={t('call.placeCallSection')}
              id="call-section-header"
            />

            {/* Customer view components - Lists only the Consultation Desks */}
            <UserListsContainer
              currentUser={currentUser}
              call={call}
              onCompleteCall={completeCall}
            />
          </div>

          <StoreBoard />
        </div>
      </main>
      <Footer />
    </div>
  );
};
