/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders,
  Zap,
  Phone,
  WifiOff,
  Braces,
  Copy,
  Check,
  Coins
} from 'lucide-react';
import { useOnlineUsersStore, useCallStore, useCurrentUserStore, useTimerStore, useIncomingCallStore, useCallViewStore } from '../../states/stores.ts';

import { useResetSimulationState } from '@/src/hooks/useResetSimulationState.ts';

interface DeveloperSimulatorProps {
  onAddTokens?: (userId: string, count: number) => void;
  onSimulateIncomingCall?: (attendantId: string) => void;
  onSimulateIncomingCallAsCustomer?: (customerId: string, attendantId: string) => void;
}

export const DeveloperSimulator: React.FC<DeveloperSimulatorProps> = (props) => {
  const {
    onAddTokens,
    onSimulateIncomingCall,
    onSimulateIncomingCallAsCustomer,
  } = props;

  const reset = useResetSimulationState();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((s) => s.users);
  const call = useCallStore((s) => s.call);
  const timerStatus = useTimerStore((s) => s.status);
  const timerElapsed = useTimerStore((s) => s.elapsedSeconds);
  const incomingCall = useIncomingCallStore((s) => s.incomingCall);
  const answerIncomingCall = useCallStore((s) => s.answerIncomingCall);
  const callViewState = useCallViewStore();

  if ((import.meta as any).env?.VITE_ENV !== 'simulation') {
    return null;
  }

  const [isOpen, setIsOpen] = useState(true);
  const [jsonTab, setJsonTab] = useState<'calls' | 'users' | 'timer' | 'incoming' | 'view-state' | 'full'>('calls');
  const [copied, setCopied] = useState(false);


  const timerState = { status: timerStatus, elapsedSeconds: timerElapsed };

  const getJsonContent = () => {
    switch (jsonTab) {
      case 'calls':
        return call;
      case 'users':
        return users;
      case 'timer':
        return timerState;
      case 'incoming':
        return incomingCall;
      case 'view-state': {
        const { ...viewStateData } = callViewState;
        return viewStateData;
      }
      case 'full':
      default:
        return { users, call, incomingCall, timer: timerState, viewState: callViewState };
    }
  };

  const currentJsonString = JSON.stringify(getJsonContent(), null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="developer-simulator-panel" className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-xl border border-slate-800 transition-all">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-tight flex items-center gap-1.5 leading-none">
              Developer Simulator
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                Sandbox
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Simulate active client rooms and test agent session rules</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
        >
          {isOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isOpen && (
        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Simular Comportamentos
          </h4>
          
          <div className="space-y-3">
            {/* Outgoing Call Simulation Section for Logged-in Customers */}
            {currentUser && currentUser.role === 'customer' && (
              <div id="sim-outgoing-call-section" className="pt-2.5 border-t border-slate-800/50">
                <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Phone className="w-3 h-3 text-sky-400" />
                  Simular Ligação para Atendente
                </h5>
                <p className="text-[10px] text-slate-400 mb-2">
                  Simule o envio de uma chamada para um atendente disponível.
                </p>
                {incomingCall?.customerId === currentUser.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded p-2 text-center">
                      Aguardando atendente responder...
                    </div>
                    <button
                      type="button"
                      onClick={() => answerIncomingCall(null)}
                      className="w-full text-center py-2 px-3 text-xs font-bold text-emerald-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition border border-emerald-600/25 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      Simular atendente atender ✅
                    </button>
                  </div>
                ) : (call?.customerId === currentUser.id && call.status === 'active') ? (
                  <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded p-2 text-center">
                    Ligação em andamento.
                  </div>
                ) : (
                  <>
                    {users.filter(u => u.role === 'attendant' && u.status === 'idle').length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">Nenhum atendente disponível no momento.</p>
                    ) : (
                      <div className="space-y-2">
                        {users.filter(u => u.role === 'attendant' && u.status === 'idle').map((att) => (
                          <div key={att.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/45">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={att.avatarUrl}
                                alt={att.name}
                                className="w-5 h-5 rounded-full border border-slate-700 object-cover shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${att.name}`;
                                }}
                              />
                              <p className="text-xs font-semibold text-slate-200 truncate leading-tight">{att.name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSimulateIncomingCallAsCustomer?.(currentUser.id, att.id)}
                              className="px-2 py-1 text-[9px] font-bold bg-sky-600 hover:bg-sky-500 text-white rounded cursor-pointer transition active:scale-95"
                            >
                              Ligar 📞
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Incoming Call Simulation Section for Logged-in Attendants */}
            {currentUser && currentUser.role === 'attendant' && (
              <div id="sim-incoming-call-section" className="pt-2.5 border-t border-slate-800/50">
                <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  Simular Chamada de Cliente
                </h5>
                <p className="text-[10px] text-slate-400 mb-2">
                  Gere um cenário de chamada recebida de um cliente (se necessário, um novo cliente será criado).
                </p>
                {(incomingCall?.attendantId === currentUser.id ||
                  (call?.attendantId === currentUser.id && call.status === 'active')) ? (
                  <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded p-2 text-center">
                    Você já possui uma chamada ativa ou em escala de resposta.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSimulateIncomingCall) {
                        onSimulateIncomingCall(currentUser.id);
                      }
                    }}
                    className="w-full text-center py-2 px-3 text-xs font-bold text-emerald-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition border border-emerald-600/25 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Simular Chamada Recebida 📞
                  </button>
                )}
              </div>
            )}

            {/* Boost Client Tokens Section */}
            <div id="sim-boost-tokens-section" className="pt-2 border-t border-slate-800/50">
              <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Coins className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                Injetar / Aumentar Tokens de Clientes
              </h5>
              {users.filter(u => u.role === 'customer').length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">Nenhum cliente online para recarregar.</p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {users.filter(u => u.role === 'customer').map((cust) => {
                    const currentTokens = cust.tokens !== undefined ? cust.tokens : 5;
                    return (
                      <div key={cust.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/45">
                        <div className="flex items-center gap-2 min-w-0">
                          <img 
                            src={cust.avatarUrl} 
                            alt={cust.name} 
                            className="w-5 h-5 rounded-full border border-slate-700 object-cover shrink-0" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${cust.name}`;
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate leading-tight">{cust.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono">Saldo: {currentTokens} {currentTokens === 1 ? 'token' : 'tokens'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (onAddTokens) {
                                onAddTokens(cust.id, 10);
                              }
                            }}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer transition active:scale-95"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onAddTokens) {
                                onAddTokens(cust.id, 50);
                              }
                            }}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 rounded cursor-pointer transition active:scale-95"
                          >
                            +50
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onAddTokens) {
                                onAddTokens(cust.id, 100);
                              }
                            }}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition active:scale-95"
                          >
                            +100
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Simulated clear and reset controls */}
            <div id="sim-danger-controls" className="pt-2 border-t border-slate-800/50">
              <button
                type="button"
                onClick={() => {
                  reset();
                }}
                className="w-full text-center py-2 px-2 text-[10px] font-bold text-slate-300 bg-slate-800/60 border border-slate-700/50 rounded-lg hover:bg-slate-700 hover:text-white transition cursor-pointer active:scale-95"
              >
                Resetar Todo Estado 🔄
              </button>
            </div>

            {/* Connection Drop Simulation */}
            {call?.status === 'active' && (
              <div id="sim-connection-drop-section" className="pt-2.5 border-t border-slate-800/50">
                <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  Instabilidade de Rede
                </h5>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/65 flex flex-col gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-100 flex items-center gap-1">
                      <span className="text-blue-400 truncate max-w-[120px]">{call.customerName}</span>
                      <span className="text-slate-500 text-[10px]">➡</span>
                      <span className="text-purple-400 truncate max-w-[120px]">{call.attendantName}</span>
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 font-sans text-[10px]">
                      <span className="text-slate-500">Status:</span>
                      {callViewState.viewState === 'call-interrupted' ? (
                        <span className="text-amber-500 font-bold flex items-center gap-1">
                          🔌 Conexão Interrompida
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-bold flex items-center gap-1">
                          🟢 Ativa & Fluindo
                        </span>
                      )}
                    </div>
                  </div>
                  {callViewState.viewState === 'call-interrupted' ? (
                    <button
                      type="button"
                      onClick={() => callViewState.setViewState('in-call')}
                      id="sim-reconnect-btn"
                      className="w-full text-center py-1.5 px-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                    >
                      Simular Retorno do Usuário 📡
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => callViewState.setViewState('call-interrupted')}
                      id="sim-disconnect-btn"
                      className="w-full text-center py-1.5 px-2 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md hover:bg-amber-500 hover:text-slate-950 transition cursor-pointer"
                    >
                      Simular Queda de Conexão 🔌
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Real-time State JSON Viewer Board */}
            <div id="json-state-board-section" className="mt-4 pt-4 border-t border-slate-800/80 select-none">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Braces className="w-3.5 h-3.5 text-indigo-400" />
                  Estado do Sistema (JSON Board)
                </h5>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition bg-slate-900 border border-slate-800 px-2 py-1 rounded cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copiar JSON
                    </>
                  )}
                </button>
              </div>

              {/* Tabs for JSON board selection */}
              <div className="flex gap-1.5 mb-2 border-b border-slate-900 pb-2">
                <button
                  type="button"
                  onClick={() => setJsonTab('calls')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    jsonTab === 'calls' 
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ligações ({call ? 1 : 0})
                </button>
                <button
                  type="button"
                  onClick={() => setJsonTab('users')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    jsonTab === 'users' 
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Usuários ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJsonTab('timer')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    jsonTab === 'timer'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Timer {timerStatus === 'playing' ? '▶' : '⏹'}
                </button>
                <button
                  type="button"
                  onClick={() => setJsonTab('incoming')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    jsonTab === 'incoming'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Incoming {incomingCall ? '🔔' : '—'}
                </button>
                <button
                  type="button"
                  onClick={() => setJsonTab('view-state')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    jsonTab === 'view-state'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  View State
                </button>
                <button
                  type="button"
                  onClick={() => setJsonTab('full')}
                  className={`text-[10px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    jsonTab === 'full'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Geral Completo
                </button>
              </div>

              {/* Pretty JSON panel code display */}
              <div className="relative mt-2">
                <pre className="text-[10px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 overflow-y-auto max-h-52 text-indigo-200 select-text scrollbar-thin scrollbar-thumb-slate-850">
                  <code>{currentJsonString}</code>
                </pre>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
