/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Video, 
  Clock, 
  Coins 
} from 'lucide-react';
import { CallState } from '@/src/states/call/state.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';

interface CustomerListProps {
  users: OnlineUserState[];
  currentUser: OnlineUserState | null;
  call: CallState | null;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  users,
  currentUser,
  call,
}) => {
  const customers = users.filter(u => u.role === 'customer');

  const getCustomerCall = (custId: string) => {
    return call?.customerId === custId &&
      (call.status === 'active' || call.status === 'call-interrupteded')
      ? call : undefined;
  };

  const getSortScore = (cust: OnlineUserState) => {
    if (cust.status === 'offline') return 4;
    if (cust.status === 'disconnecting') return 3;
    const busyCall = getCustomerCall(cust.id);
    if (busyCall) return 2;
    return 1;
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    const scoreA = getSortScore(a);
    const scoreB = getSortScore(b);
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div id="customers-desk-panel" className="bg-white border border-brand-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-brand-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-brand-ochre rounded-full" />
          <h3 className="font-bold font-mono text-brand-dark text-base">Customers</h3>
        </div>

        <span className="text-xs bg-brand-card border border-brand-border font-semibold font-mono tracking-wide px-3 py-1 rounded-full text-brand-ochre">
          {sortedCustomers.length} Ativos
        </span>
      </div>

      <div className="space-y-3.5">
        {sortedCustomers.length === 0 ? (
          <div className="text-center py-10 text-xs text-brand-muted border border-dashed border-brand-border rounded-xl bg-brand-panel/50">
            Nenhum cliente online neste momento. Ative simuladores para preencher as salas!
          </div>
        ) : (
          sortedCustomers.map((cust) => {
            const isSelf = currentUser?.id === cust.id;
            const talkingCall = getCustomerCall(cust.id);
            const isOffline = cust.status === 'offline';
            const isDisconnecting = cust.status === 'disconnecting';

            return (
              <div
                key={cust.id}
                className={`border rounded-xl p-4 transition-all duration-200 group ${
                  isOffline
                    ? 'bg-brand-card/45 border-brand-border/40 opacity-70'
                    : isDisconnecting
                    ? 'bg-amber-50/40 border-amber-200/60 opacity-80'
                    : isSelf
                    ? 'bg-brand-panel border-brand-border-dark shadow-xs'
                    : talkingCall
                    ? 'bg-brand-panel/50 border-brand-border'
                    : 'bg-brand-card border-brand-border hover:border-brand-border-dark'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-brand-border bg-brand-panel">
                        <img
                          src={cust.avatarUrl}
                          alt={cust.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${cust.name}`;
                          }}
                        />
                      </div>
                      {isOffline ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-400 rounded-full border-2 border-white" title="Offline" />
                      ) : isDisconnecting ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse" title="Reconectando..." />
                      ) : talkingCall ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" title="Em chamada" />
                      ) : (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" title="Online" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold font-sans text-brand-dark text-sm">{cust.name}</h4>
                        {isSelf && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-brand-ochre text-white rounded">
                            Você
                          </span>
                        )}
                        {isOffline && (
                          <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 bg-brand-panel border border-brand-border text-brand-muted rounded">
                            Offline
                          </span>
                        )}
                        {isDisconnecting && (
                          <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded animate-pulse">
                            Reconectando...
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* STATUS BADGE */}
                        {isOffline ? (
                          <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <strong>Offline</strong> · Desconectado
                          </span>
                        ) : isDisconnecting ? (
                          <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded font-medium flex items-center gap-1 animate-pulse">
                            <strong>Reconectando</strong> · Aguardando conexão
                          </span>
                        ) : talkingCall ? (
                          <span className="text-[10px] bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <strong>Ocupado</strong> · Em chamada
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <strong>Disponível</strong> · Aguardando
                          </span>
                        )}

                        {/* TOKEN BADGE */}
                        {!isOffline && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              (cust.tokens !== undefined ? cust.tokens : 5) <= 0
                                ? 'bg-red-50 text-red-600 border-red-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                            title={(cust.tokens !== undefined ? cust.tokens : 5) <= 0 ? "Sem tokens" : "Saldo de tokens"}
                          >
                            <Coins className="w-3 h-3 text-amber-500 animate-bounce" />
                            {cust.tokens !== undefined ? cust.tokens : 5} {cust.tokens === 1 ? 'token' : 'tokens'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center self-center">
                    {isOffline ? (
                      <div className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 border border-slate-200 rounded-lg flex items-center gap-1 select-none">
                        <Clock className="w-3.5 h-3.5" />
                        Offline
                      </div>
                    ) : talkingCall ? (
                      <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 border border-amber-100 rounded-lg flex items-center gap-1 select-none">
                        <Video className="w-3.5 h-3.5" />
                        Em Chamada
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-brand-muted bg-brand-panel px-2.5 py-1 border border-brand-border rounded-lg flex items-center gap-1 select-none">
                        <Clock className="w-3.5 h-3.5" />
                        Espera
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
