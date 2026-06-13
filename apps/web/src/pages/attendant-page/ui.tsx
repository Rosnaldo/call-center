/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Header } from '../../components/header/Header.tsx';
import { UnauthorizedView } from '../../components/error-view/UnauthorizedView.tsx';
import { RoleMismatchView } from '../../components/error-view/RoleMismatchView.tsx';
import { DeveloperSimulator } from '../../components/developer-simulator/DeveloperSimulator.tsx';
import { CallLobbyView } from '../../components/call-lobby-view/call-view/CallLobbyView.tsx';
import { UserLists } from '../../components/user-list/UserLists.tsx';
import { SectionHeader } from '../../components/SectionHeader.tsx';
import { CallState } from '@/src/states/call/state.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';
import filterToxicSvg from '../../assets/filter-toxic-links.svg';

interface AttendantPageUIProps {
  currentUser: OnlineUserState | null;
  users: OnlineUserState[];
  call: CallState | null;
  navigate: (path: string) => void;
  handleLogout: () => void;
  completeCall: (attendantId: string, callId?: string, byAttendant?: boolean) => void;
  addTokensSimulation: (userId: string, count: number) => void;
  updateCall: (callId: string, updates: Partial<CallState>) => void;
  simulateIncomingCall: (attendantId: string) => void;
}

export const AttendantPageUI: React.FC<AttendantPageUIProps> = ({
  currentUser,
  users,
  call,
  navigate,
  handleLogout,
  completeCall,
  addTokensSimulation,
  updateCall,
  simulateIncomingCall,
}) => {
  if (!currentUser) {
    return (
      <UnauthorizedView
        users={users}
        onLogout={handleLogout}
        navigate={navigate}
      />
    );
  }

  if (currentUser.role !== 'attendant') {
    return (
      <RoleMismatchView
        currentUser={currentUser}
        users={users}
        onLogout={handleLogout}
        navigate={navigate}
        requiredRole="attendant"
      />
    );
  }

  return (
    <div id="attendant-main-view" className="flex flex-col min-h-screen font-sans bg-slate-50/50">
      <Header users={users} onLogout={handleLogout} />
      <main className="max-w-[1000px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-grow">
        {/* ATTENDANT DASHBOARD */}
        <div id="attendant-active-dashboard" className="flex flex-col gap-6">
          
          {/* Brand Hero */}
          <div className="flex flex-col items-center text-center mt-4 mb-2 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display tracking-tight text-brand-dark leading-[1.1] mb-4">
              Block toxic links{' '}
              <span className="text-brand-ochre italic font-normal">on your device.</span>
            </h1>
            <p className="text-xs sm:text-sm text-brand-muted max-w-lg leading-relaxed">
              Call one of our attendants, share your problem, and get personalized help to resolve your issue. We're here to assist you every step of the way!
            </p>
          </div>

          {/* SVG Illustration */}
          <div className="w-full max-w-2xl mx-auto px-4 py-2">
            <img
              src={filterToxicSvg}
              alt="Filter toxic links illustration"
              className="w-full h-auto select-none pointer-events-none"
              draggable={false}
            />
          </div>

          <div className="flex flex-col gap-6">
            <SectionHeader
              sectionNumber="01"
              title="Active video meet lobby."
              id="lobby-section-header"
            />

            {/* Connected callers monitor rooms for Agents */}
            <CallLobbyView
              onHangUp={completeCall}
            />

            <SectionHeader
              sectionNumber="02"
              title="Manage your queue and clients."
              id="queue-section-header"
            />

            {/* Attendant workspace columns - lists online queues and waiting clients */}
            <UserLists
              users={users}
              currentUser={currentUser}
              call={call}
              onCompleteCall={completeCall}
            />
          </div>

          {/* Developer Simulator */}
          <DeveloperSimulator
            onUpdateCall={updateCall}
            onAddTokens={addTokensSimulation}
            onSimulateIncomingCall={simulateIncomingCall}
          />
        </div>
      </main>
    </div>
  );
};
