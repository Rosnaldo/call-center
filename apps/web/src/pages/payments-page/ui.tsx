/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/header/Header.tsx';
import { Footer } from '../../components/Footer.tsx';
import {
  ArrowLeft,
  Coins,
  CreditCard,
  Check,
  Sparkles,
  Info,
  Loader2
} from 'lucide-react';
import { OnlineUserState } from '@/src/states/online-users/state.ts';
import { useLogout } from '../../hooks/auth/useLogout.ts';
import properties from '../../properties';

interface PaymentsPageUIProps {
  currentUser: OnlineUserState | null;
  users: OnlineUserState[];
  addTokensSimulation: (userId: string, count: number) => void;
  navigate: (path: string) => void;
}

export const PaymentsPageUI: React.FC<PaymentsPageUIProps> = ({
  currentUser,
  users,
  addTokensSimulation,
  navigate,
}) => {
  const { t } = useTranslation();
  const handleLogout = useLogout();

  const TOKEN_PACKS = [
    {
      id: 'pack_basic',
      tokens: 5,
      price: 10.00,
      title: t('payments.packStarter'),
      badge: t('payments.mostAffordable'),
      color: 'from-amber-500 to-orange-600',
      description: t('payments.packStarterDesc')
    },
    {
      id: 'pack_standard',
      tokens: 15,
      price: 25.00,
      title: t('payments.packEssential'),
      badge: t('payments.popular') + ' ⭐',
      color: 'from-indigo-500 to-purple-600',
      description: t('payments.packEssentialDesc')
    },
    {
      id: 'pack_premium',
      tokens: 40,
      price: 60.00,
      title: t('payments.packBusiness'),
      badge: t('payments.bestValue'),
      color: 'from-emerald-500 to-teal-600',
      description: t('payments.packBusinessDesc')
    }
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm text-center">
          <p className="text-slate-600 mb-4">{t('payments.loginRequired')}</p>
          <button
            onClick={() => navigate('login')}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            {t('payments.goToLogin')}
          </button>
        </div>
      </div>
    );
  }

  const [selectedPack, setSelectedPack] = useState<string | 'custom'>('pack_standard');
  const [customTokens, setCustomTokens] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ amount: number; price: number } | null>(null);

  // Get active pack stats
  const activePack = selectedPack !== 'custom' ? TOKEN_PACKS.find(p => p.id === selectedPack) : null;
  const currentPrice = activePack ? activePack.price : (customTokens * 1.80);
  const currentTokensAmount = activePack ? activePack.tokens : customTokens;

  const handleCustomTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setCustomTokens(val);
    } else if (e.target.value === '') {
      setCustomTokens(0);
    }
  };

  const handleBuy = async () => {
    if (currentTokensAmount <= 0) return;
    setIsProcessing(true);
    setSuccessInfo(null);

    try {
      if (!properties.isSimulation) {
        const response = await fetch('/api/buy-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            count: currentTokensAmount,
          }),
        });

        if (!response.ok) {
          throw new Error(t('payments.purchaseError'));
        }
      }

      addTokensSimulation(currentUser.id, currentTokensAmount);

      setSuccessInfo({
        amount: currentTokensAmount,
        price: currentPrice
      });
    } catch (err) {
      console.error(err);
      alert(t('payments.paymentServerError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const currentTokensFromState = users.find(u => u.id === currentUser.id)?.tokens ?? 0;

  return (
    <div id="payments-page-view" className="flex flex-col min-h-screen font-sans bg-slate-50/50">
      <Header users={users} onLogout={handleLogout} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Back Link */}
        <button
          onClick={() => navigate('customer')}
          className="group flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {t('payments.backToPanel')}
        </button>

        {successInfo ? (
          /* SUCCESS SCREEN */
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 text-center max-w-xl mx-auto">
            <div className="mx-auto size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center">{t('payments.purchaseComplete')}</h1>
            <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center justify-center gap-1.5 bg-emerald-50 max-w-fit mx-auto px-4 py-1.5 rounded-full select-none">
              <Sparkles className="w-4 h-4" />
              {t('payments.tokensCredited', { amount: successInfo.amount })}
            </p>

            <div className="my-8 py-5 border-y border-slate-100 text-left space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">{t('payments.paymentStatus')}</span>
                <span className="text-emerald-600 font-semibold uppercase tracking-tight">{t('payments.confirmed')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-semibold">{t('payments.totalAmount')}</span>
                <span className="text-sm font-bold text-slate-800">R$ {successInfo.price.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-semibold">{t('payments.newTokenBalance')}</span>
                <span className="text-sm font-black text-indigo-600 flex items-center gap-1 font-mono">
                  <Coins className="w-4 h-4" /> {t('payments.tokensCount', { count: currentTokensFromState })}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-6">
              {t('payments.rechargeSuccess')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSuccessInfo(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t('payments.buyMoreTokens')}
              </button>
              <button
                onClick={() => navigate('customer')}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl hover:-translate-y-0.5 transition cursor-pointer shadow-md shadow-indigo-600/15"
              >
                {t('payments.backToPanel2')}
              </button>
            </div>
          </div>
        ) : (
          /* CHOOSE TOKEN PACK SCREEN */
          <div className="space-y-8">

            {/* Header Title with token Summary */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5.5 h-5.5 text-indigo-500" />
                  {t('payments.buyRechargeTokens')}
                </h1>
                <p className="text-xs text-slate-400 mt-1">{t('payments.rechargeHint')}</p>
              </div>
              <div className="bg-slate-100/70 border border-slate-200/50 px-4 py-3 rounded-xl flex items-center gap-3">
                <div className="size-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-mono">
                  <Coins className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{t('payments.yourBalance')}</p>
                  <p className="text-base font-black text-slate-700 font-mono">{t('payments.tokensCount', { count: currentTokensFromState })}</p>
                </div>
              </div>
            </div>

            {/* Content main selector card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">

              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-6">
                {t('payments.selectPackOrCustom')}
              </p>

              {/* Grid of basic preset packages */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {TOKEN_PACKS.map((pack) => {
                  const isSelected = selectedPack === pack.id;
                  return (
                    <button
                      type="button"
                      key={pack.id}
                      onClick={() => setSelectedPack(pack.id)}
                      className={`relative rounded-2xl p-6 border text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer shadow-3xs ${
                        isSelected
                          ? 'border-indigo-600 ring-4 ring-indigo-50/70 bg-indigo-50/5'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {/* Optional Badge */}
                      <span className={`absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 ${
                        isSelected ? 'bg-indigo-100 text-indigo-800' : ''
                      }`}>
                        {pack.badge}
                      </span>

                      <div>
                        {/* Graphic symbol */}
                        <div className={`size-10 rounded-xl bg-gradient-to-br ${pack.color} text-white flex items-center justify-center font-bold text-sm font-mono mb-4`}>
                          +{pack.tokens}
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 leading-tight">{pack.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                          {pack.description}
                        </p>
                      </div>

                      <div className="mt-8 pt-4 border-t border-slate-100 flex items-baseline justify-between w-full">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('payments.totalValue')}</span>
                        <span className="text-lg font-black text-slate-800">R$ {pack.price.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom amount section wrapper */}
              <div className="mb-8 p-4 bg-slate-50 border border-slate-200/50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedPack('custom')}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors mb-4"
                >
                  <div className={`size-4 rounded border flex items-center justify-center transition-colors ${
                    selectedPack === 'custom' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}>
                    {selectedPack === 'custom' && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span>{t('payments.customAmount')}</span>
                </button>

                {selectedPack === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in pl-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">
                        {t('payments.tokenQuantity')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={customTokens}
                          onChange={handleCustomTokensChange}
                          placeholder="Ex: 10"
                          className="w-full px-4 py-2.5 border border-slate-250 rounded-xl text-sm font-bold focus:outline-hidden focus:border-indigo-500 font-mono text-slate-800 pl-10"
                        />
                        <Coins className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">
                        {t('payments.estimatedCost')}
                      </label>
                      <div className="px-4 py-2.5 bg-slate-100 rounded-xl border border-slate-200 text-sm font-black text-slate-700 flex items-center justify-between font-mono">
                        <span>{t('payments.price')}</span>
                        <span>R$ {(customTokens * 1.80).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100/50 mb-8 text-xs text-indigo-900 select-none">
                <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                <span>{t('payments.callsInfo')}</span>
              </div>

              {/* Action trigger button */}
              <button
                type="button"
                onClick={handleBuy}
                disabled={isProcessing || currentTokensAmount <= 0}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('payments.processing')}
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    {t('payments.confirmRecharge', { price: currentPrice.toFixed(2).replace('.', ',') })}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};
