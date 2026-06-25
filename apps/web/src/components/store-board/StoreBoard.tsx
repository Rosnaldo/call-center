import React, { useState } from 'react';
import { Braces, Copy, Check } from 'lucide-react';
import { useOnlineUsersStore, useCallStore, useCurrentUserStore, useTimerStore, useIncomingCallStore, useCallViewStore } from '../../states/stores.ts';

export const StoreBoard: React.FC = () => {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((s) => s.users);
  const call = useCallStore((s) => s.call);
  const timerStatus = useTimerStore((s) => s.status);
  const timerElapsed = useTimerStore((s) => s.elapsedSeconds);
  const incomingCall = useIncomingCallStore((s) => s.incomingCall);
  const callViewState = useCallViewStore();

  const env = (import.meta as any).env?.VITE_ENV ?? '';
  if (env === 'production') return null;

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
    <div id="json-state-board-section" className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-xl border border-slate-800 transition-all select-none">
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

      <div className="relative mt-2">
        <pre className="text-[10px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 overflow-y-auto max-h-52 text-indigo-200 select-text scrollbar-thin scrollbar-thumb-slate-850">
          <code>{currentJsonString}</code>
        </pre>
      </div>
    </div>
  );
};
