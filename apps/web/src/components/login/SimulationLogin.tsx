/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, ShieldCheck } from 'lucide-react';
import { useOnlineUsersStore, useCurrentUserStore } from '@/src/states/stores';


export const SimulationLogin = () => {
  const navigate = useNavigate();
  const users = useOnlineUsersStore((state) => state.users);
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const [presetFilter, setPresetFilter] = useState<'all' | 'customer' | 'attendant'>('all');

  const preSets = users.filter((u) => 
    u.id === 'att-alex' ||
    u.id === 'att-samantha' ||
    u.id === 'att-marcus' ||
    u.id === 'cust-emily' ||
    u.id === 'cust-david' ||
    u.id === 'cust-sophia'
  );

  const filteredPresets = preSets.filter((preset) => {
    if (presetFilter === 'all') return true;
    return preset.role === presetFilter;
  });

  return (
    <div id="identity-gate-layout" className="max-w-2xl mx-auto bg-white border border-slate-200/70 rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
      {/* Decorative banner border top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />

      <div className="flex flex-col gap-6">
        {/* Title and Intro */}
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-semibold text-xs mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Interactive Template Simulator
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Welcome to the Video Call Center
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-lg">
            This workspace acts as a live, real-time template. Select an identity below to log in as a customer or attendant, or open multiple browser tabs to simulate genuine client routing!
          </p>
        </div>

        {/* Section 1: Preset quick join cards */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              Join with a Quick-Start Profile
            </h3>

            {/* Filter Toggle Buttons / Select Role */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
              <button
                type="button"
                onClick={() => setPresetFilter('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  presetFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-xs scale-105'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPresetFilter('customer')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  presetFilter === 'customer'
                    ? 'bg-sky-600 text-white shadow-xs scale-105'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Customers
              </button>
              <button
                type="button"
                onClick={() => setPresetFilter('attendant')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  presetFilter === 'attendant'
                    ? 'bg-indigo-600 text-white shadow-xs scale-105'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Attendants
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                id={`preset-join-${preset.id}`}
                onClick={() => { setCurrentUser({ ...preset, status: 'idle' }); navigate('/painel'); }}
                className="flex items-center justify-between border border-slate-200/80 rounded-xl p-3.5 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs text-left group transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 bg-slate-50">
                    <img 
                      src={preset.avatarUrl} 
                      alt={preset.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${preset.name}`;
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-800 group-hover:text-indigo-600 transition">
                      {preset.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {preset.role === 'attendant' ? 'Agent Profile' : 'Client Persona'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    preset.role === 'attendant' 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                      : 'bg-sky-50 text-sky-700 border border-sky-100'
                  }`}>
                    {preset.role}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
