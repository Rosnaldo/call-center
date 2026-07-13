/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Video
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCallViewStore, useIncomingCallStore } from '../../states/stores.ts';

import { CallState } from '@/src/states/shared/call/state.ts';
import { OnlineUserState } from '@/src/states/shared/online-users/state.ts';
import { IUser } from '@repo/shared-types';

interface AttendantListProps {
  users: OnlineUserState[];
  currentUser: IUser | null;
  call: CallState | null;
  onCompleteCall: (attendantId: string) => void;
}

export const AttendantList: React.FC<AttendantListProps> = ({
  users,
  currentUser,
  call,
  onCompleteCall: _onCompleteCall,
}) => {

  const { t } = useTranslation();
  const selectedAttendantId = useCallViewStore((s) => s.selectedAttendantId);
  const selectAttendant = useCallViewStore((s) => s.selectAttendant);
  const incomingCall = useIncomingCallStore((s) => s.incomingCall);

  const onlineAttendants = users.filter(u => u.role === 'attendant' || u.role === 'admin');

  const getAttendantCall = (atId: string) => {
    return call?.attendantId === atId
      ? call : undefined;
  };

  const getAttendantcall = (atId: string) => {
    return call?.attendantId === atId
      ? call : undefined;
  };

  const getAttendantOccupiedOrRinging = (atId: string) => {
    return call?.attendantId === atId
      ? call : undefined;
  };

  // Dynamic online attendants mapped from the state users array
  const allAttendantsMapped: (OnlineUserState & { isDisconnecting?: boolean })[] = onlineAttendants.map(at => ({
    ...at,
    isDisconnecting: at.status === 'disconnecting',
  }));

  // Sort: Available first, Busy second, Disconnecting last.
  const getSortScore = (at: OnlineUserState & { isDisconnecting?: boolean }) => {
    if (at.isDisconnecting) return 3;
    const busyCall = getAttendantOccupiedOrRinging(at.id);
    if (busyCall) return 2;
    return 1;
  };

  const sortedAttendants = [...allAttendantsMapped].sort((a, b) => {
    const scoreA = getSortScore(a);
    const scoreB = getSortScore(b);
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return a.name.localeCompare(b.name);
  });

  const isCustomerCurrentlyBusy = (customerId: string) => {
    return call?.customerId === customerId;
  };

  return (
    <div className="flex flex-col gap-4">

      <div id="attendants-desk-panel" className="bg-white border border-brand-border rounded-3xl p-6 flex flex-col gap-5">

        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-brand-border-dark pb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3.5 bg-brand-ochre rounded-full" />
            <h3 className="font-bold font-mono text-brand-dark text-base">{t('attendantList.availableAttendants')}</h3>
          </div>
          <span className="text-xs bg-brand-card border border-brand-border font-semibold font-mono tracking-wide px-3 py-1 rounded-full text-brand-ochre">
            {sortedAttendants.length} Online
          </span>
        </div>

        <div className="space-y-4">
          {sortedAttendants.length === 0 ? (
            <div className="text-center py-10 text-xs text-brand-muted border border-dashed border-brand-border rounded-2xl bg-brand-card">
              {t('attendantList.noAttendants')}
            </div>
          ) : (
            sortedAttendants.map((at) => {
              const activeCall = getAttendantcall(at.id);
              const busyCall = getAttendantOccupiedOrRinging(at.id);
              const isSelf = currentUser?._id === at.id;
              const isDisconnecting = at.isDisconnecting ?? false;

              const currentCustInActiveWithThisAtt = getAttendantCall(at.id) && currentUser && getAttendantCall(at.id)?.customerId === currentUser._id;
              const isLocalCustomerBusyState = currentUser ? isCustomerCurrentlyBusy(currentUser._id) : false;

              return (
                <div
                  key={at.id}
                  className={`border rounded-2xl p-4 transition-all duration-300 group ${
                    isDisconnecting
                      ? 'bg-amber-50/40 border-amber-200/60 opacity-80'
                      : isSelf
                      ? 'bg-brand-card border-brand-ochre/30'
                      : activeCall
                      ? 'bg-brand-card border-brand-border-dark'
                      : 'bg-brand-card border-brand-border hover:border-brand-border-dark'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-brand-border-dark bg-brand-panel">
                          <img
                            src={at.avatarUrl}
                            alt={at.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${at.name}`;
                            }}
                          />
                        </div>
                        {isDisconnecting ? (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white animate-pulse" title={t('attendantList.reconnecting')} />
                        ) : activeCall ? (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white" title={t('attendantList.inCall')} />
                        ) : (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" title={t('attendantList.ready')} />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold font-sans text-brand-dark text-sm sm:text-base">{at.name}</h4>
                          {isSelf && (
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-brand-ochre text-white rounded">
                              {t('attendantList.you')}
                            </span>
                          )}
                          {isDisconnecting && (
                            <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded animate-pulse">
                              {t('attendantList.reconnecting')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {isDisconnecting ? (
                            <span className="text-[10px] font-mono tracking-tight bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded font-medium flex items-center gap-1.5 animate-pulse">
                              <strong>{t('attendantList.statusReconnecting')}</strong> · {t('attendantList.statusReconnectingDesc')}
                            </span>
                          ) : activeCall ? (
                            <span className="text-[10px] font-mono tracking-tight bg-amber-50 border border-amber-100/50 text-amber-700 px-2 py-0.5 rounded font-medium flex items-center gap-1.5">
                              <strong>{t('attendantList.statusBusy')}</strong> · {t('attendantList.statusBusyDesc')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono tracking-tight bg-emerald-50 border border-emerald-100/50 text-emerald-600 px-2 py-0.5 rounded font-medium flex items-center gap-1.5">
                              <strong>{t('attendantList.statusActive')}</strong> · {t('attendantList.statusActiveDesc')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div id={`at-actions-${at.id}`} className="shrink-0">
                      {isDisconnecting ? (
                        <button
                          disabled
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-400 border border-amber-200 cursor-not-allowed flex items-center gap-1.5"
                          title={t('attendantList.reconnecting')}
                        >
                          <Video className="w-3.5 h-3.5" />
                          {t('attendantList.statusReconnecting')}
                        </button>
                      ) : currentUser?.role === 'customer' ? (
                        currentCustInActiveWithThisAtt ? (
                          <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2 border border-amber-200 rounded-xl flex items-center gap-1.5 animate-pulse cursor-not-allowed">
                            <Video className="w-3.5 h-3.5" />
                            {t('attendantList.connected')}
                          </div>
                        ) : (
                          (() => {
                            const customerUserObj = users.find(u => u.id === currentUser._id);
                            const hasNoTokens = customerUserObj ? (customerUserObj.tokens !== undefined ? customerUserObj.tokens : 5) <= 0 : false;

                            if (hasNoTokens) {
                              return (
                                <button
                                  id={`buy-shortcut-${at.id}`}
                                  disabled
                                  className="px-3 py-2 rounded-xl text-xs font-bold bg-brand-panel text-brand-muted/50 border border-brand-border transition-all flex items-center gap-1.5 cursor-not-allowed"
                                  title={t('attendantList.noTokensHint')}
                                >
                                  {t('attendantList.buyTokens')}
                                </button>
                              );
                            }

                            const isSelectedInLobby = selectedAttendantId === at.id && !isLocalCustomerBusyState;

                            if (isSelectedInLobby) {
                              return (
                                <button
                                  id={`call-deselect-${at.id}`}
                                  className="px-3 py-2 rounded-xl text-xs font-bold bg-brand-panel border border-brand-border text-brand-muted/50 transition-colors flex items-center gap-1.5 cursor-not-allowed"
                                  title={t('attendantList.closeLobby')}
                                  disabled
                                >
                                  <Video className="w-3.5 h-3.5 text-brand-muted/40" />
                                  {t('attendantList.selected')}
                                </button>
                              );
                            }

                            return (
                              <button
                                id={`call-start-${at.id}`}
                                onClick={() => selectAttendant(at.id)}
                                disabled={isLocalCustomerBusyState || !!busyCall || !!incomingCall}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                                  isLocalCustomerBusyState || !!busyCall || !!incomingCall
                                    ? 'bg-brand-panel text-brand-muted/50 border border-brand-border cursor-not-allowed'
                                    : 'bg-brand-ochre text-white hover:bg-brand-ochre-hover cursor-pointer'
                                }`}
                                title={
                                  isLocalCustomerBusyState || !!incomingCall
                                    ? t('attendantList.alreadyConnected')
                                    : busyCall
                                    ? t('attendantList.attendantBusy')
                                    : t('attendantList.enterLobby')
                                }
                              >
                                <Video className="w-3.5 h-3.5" />
                                {busyCall ? t('attendantList.busy') : t('attendantList.callAction')}
                              </button>
                            );
                          })()
                        )
                      ) : isSelf ? (
                        activeCall ? null : (
                          <span className="text-xs text-brand-muted font-medium">{t('attendantList.waiting')}</span>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
