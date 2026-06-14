/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Video 
} from 'lucide-react';
import { useCallViewStore } from '../call-lobby-view/states/store.ts';
import { useNavigate } from 'react-router-dom';
import { CallState } from '@/src/states/call/state.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';

interface AttendantListProps {
  users: OnlineUserState[];
  currentUser: OnlineUserState | null;
  call: CallState | null;
  onCompleteCall: (attendantId: string) => void;
}

export const AttendantList: React.FC<AttendantListProps> = ({
  users,
  currentUser,
  call,
  onCompleteCall,
}) => {
  const navigate = useNavigate();
  const selectedAttendantId = useCallViewStore((s) => s.selectedAttendantId);
  const setSelectedAttendantId = useCallViewStore((s) => s.setSelectedAttendantId);

  const onlineAttendants = users.filter(u => u.role === 'attendant');

  const getAttendantCall = (atId: string) => {
    return call?.attendantId === atId &&
      (call.status === 'active' || call.status === 'awaiting-answer' || call.status === 'call-interrupteded')
      ? call : undefined;
  };

  const getAttendantcall = (atId: string) => {
    return call?.attendantId === atId &&
      (call.status === 'active' || call.status === 'call-interrupteded')
      ? call : undefined;
  };

  const getAttendantOccupiedOrRinging = (atId: string) => {
    return call?.attendantId === atId &&
      (call.status === 'active' || call.status === 'awaiting-answer' || call.status === 'call-interrupteded')
      ? call : undefined;
  };

  // Dynamic online attendants mapped from the state users array
  const allAttendantsMapped: (OnlineUserState & { isOffline?: boolean })[] = onlineAttendants.map(at => ({
    ...at,
    isOffline: false
  }));

  // Sort: Available (online & idle) first, Busy (online & on call) second, Offline third.
  const getSortScore = (at: OnlineUserState & { isOffline?: boolean }) => {
    if (at.isOffline) {
      return 3; // Offline/Unavailable lowest
    }
    const busyCall = getAttendantOccupiedOrRinging(at.id);
    if (busyCall) {
      return 2; // Online but busy in-call or ringing
    }
    return 1; // Online and available/idle highest
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
    return call?.customerId === customerId &&
      (call?.status === 'active' || call?.status === 'awaiting-answer' || call?.status === 'call-interrupteded');
  };

  return (
    <div className="flex flex-col gap-4">

      <div id="attendants-desk-panel" className="bg-white border border-brand-border rounded-3xl p-6 flex flex-col gap-5">

        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-brand-border-dark pb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3.5 bg-brand-ochre rounded-full" />
            <h4 className="text-[10px] font-bold font-mono tracking-wider text-brand-dark uppercase">Atendentes Disponíveis</h4>
          </div>
          <span className="text-xs bg-brand-card border border-brand-border font-semibold font-mono tracking-wide px-3 py-1 rounded-full text-brand-ochre">
            {sortedAttendants.length} Online
          </span>
        </div>

        <div className="space-y-4">
          {sortedAttendants.length === 0 ? (
            <div className="text-center py-10 text-xs text-brand-muted border border-dashed border-brand-border rounded-2xl bg-brand-card">
              No attendants registered in the system.
            </div>
          ) : (
            sortedAttendants.map((at) => {
              const activeCall = getAttendantcall(at.id);
              const busyCall = getAttendantOccupiedOrRinging(at.id);
              const isSelf = currentUser?.id === at.id;

              const currentCustInActiveWithThisAtt = getAttendantCall(at.id) && currentUser && getAttendantCall(at.id)?.customerId === currentUser.id;
              const isLocalCustomerBusyState = currentUser ? isCustomerCurrentlyBusy(currentUser.id) : false;

              return (
                <div
                  key={at.id}
                  className={`border rounded-2xl p-4 transition-all duration-300 group ${
                    at.isOffline
                      ? 'bg-brand-card/45 border-brand-border/40 opacity-70'
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
                        {at.isOffline ? (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white" title="Offline" />
                        ) : activeCall ? (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white" title="In call" />
                        ) : (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" title="Ready" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold font-sans text-brand-dark text-sm sm:text-base">{at.name}</h4>
                          {isSelf && (
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-brand-ochre text-white rounded">
                              Você
                            </span>
                          )}
                          {at.isOffline && (
                            <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 bg-brand-panel border border-brand-border text-brand-muted rounded">
                              Offline
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {at.isOffline ? (
                            <span className="text-[10px] font-mono tracking-tight bg-amber-50 border border-amber-100/50 text-amber-700 px-2 py-0.5 rounded font-medium flex items-center gap-1.5">
                              <strong>Offline</strong> · Indisponível
                            </span>
                          ) : activeCall ? (
                            <span className="text-[10px] font-mono tracking-tight bg-amber-50 border border-amber-100/50 text-amber-700 px-2 py-0.5 rounded font-medium flex items-center gap-1.5">
                              <strong>Ocupado</strong> · Em atendimento
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono tracking-tight bg-emerald-50 border border-emerald-100/50 text-emerald-600 px-2 py-0.5 rounded font-medium flex items-center gap-1.5">
                              <strong>Ativo</strong> · Disponível
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div id={`at-actions-${at.id}`} className="shrink-0">
                      {at.isOffline ? (
                        <button
                          disabled
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-brand-panel text-brand-muted/55 border border-brand-border cursor-not-allowed flex items-center gap-1.5"
                          title="This attendant is offline/unavailable"
                        >
                          <Video className="w-3.5 h-3.5 text-brand-muted/40" />
                          Offline
                        </button>
                      ) : currentUser?.role === 'customer' ? (
                        currentCustInActiveWithThisAtt ? (
                          <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2 border border-amber-200 rounded-xl flex items-center gap-1.5 animate-pulse">
                            <Video className="w-3.5 h-3.5" />
                            Conectado
                          </div>
                        ) : (
                          (() => {
                            const customerUserObj = users.find(u => u.id === currentUser.id);
                            const hasNoTokens = customerUserObj ? (customerUserObj.tokens !== undefined ? customerUserObj.tokens : 5) <= 0 : false;

                            if (hasNoTokens) {
                              return (
                                <button
                                  id={`buy-shortcut-${at.id}`}
                                  onClick={() => navigate('/payments')}
                                  className="px-3 py-2 rounded-xl text-xs font-bold bg-brand-ochre hover:bg-brand-ochre-hover text-white transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                                  title="Você está sem tokens. Clique para comprar tokens agora!"
                                >
                                  Comprar Tokens
                                </button>
                              );
                            }

                            const isSelectedInLobby = selectedAttendantId === at.id && !isLocalCustomerBusyState;

                            if (isSelectedInLobby) {
                              return (
                                <button
                                  id={`call-deselect-${at.id}`}
                                  onClick={() => setSelectedAttendantId(null)}
                                  className="px-3 py-2 rounded-xl text-xs font-bold bg-brand-panel border border-brand-border text-brand-ochre hover:bg-brand-border transition-colors flex items-center gap-1.5 cursor-pointer"
                                  title="Close lobby"
                                >
                                  <Video className="w-3.5 h-3.5 text-brand-ochre" />
                                  Selecionado
                                </button>
                              );
                            }

                            return (
                              <button
                                id={`call-start-${at.id}`}
                                onClick={() => setSelectedAttendantId(at.id)}
                                disabled={isLocalCustomerBusyState || !!busyCall}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                                  isLocalCustomerBusyState || !!busyCall
                                    ? 'bg-brand-panel text-brand-muted/50 border border-brand-border cursor-not-allowed'
                                    : 'bg-brand-ochre text-white hover:bg-brand-ochre-hover cursor-pointer'
                                }`}
                                title={
                                  isLocalCustomerBusyState
                                    ? 'You are already connected'
                                    : busyCall
                                    ? 'Attendant is currently busy in another call'
                                    : 'Enter attendant lobby'
                                }
                              >
                                <Video className="w-3.5 h-3.5" />
                                {busyCall ? 'Ocupado' : 'Chamar'}
                              </button>
                            );
                          })()
                        )
                      ) : isSelf ? (
                        activeCall ? (
                          <button
                            id={`self-at-complete-${at.id}`}
                            onClick={() => onCompleteCall(at.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            Finalizar
                          </button>
                        ) : (
                          <span className="text-xs text-brand-muted font-medium">Aguardando...</span>
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
