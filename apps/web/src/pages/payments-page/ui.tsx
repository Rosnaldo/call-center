/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/header/Header.tsx';
import { Footer } from '../../components/Footer.tsx';
import { BackToPanelButton } from '../../components/BackToPanelButton.tsx';
import {
  Coins,
  CreditCard,
  Check,
  Sparkles,
  Info,
  Loader2,
  History,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { IUser } from '@repo/shared-types';
import { useLogout } from '../../hooks/auth/useLogout.ts';

interface PaymentsPageUIProps {
  currentUser: IUser | null;
  addTokens: (userId: string, count: number) => void;
  navigate: (path: string) => void;
}

export const PaymentsPageUI: React.FC<PaymentsPageUIProps> = ({
  currentUser,
  addTokens,
  navigate,
}) => {
  const { t } = useTranslation();
  const handleLogout = useLogout();

  const [selectedPack, setSelectedPack] = useState<string | 'custom'>('pack_standard');
  const [customTokens, setCustomTokens] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ amount: number; price: number } | null>(null);

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
      badge: t('payments.popular'),
      color: 'from-brand-ochre to-orange-600',
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

  if (!currentUser) return null;

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
      const response = await fetch('/api/buy-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser._id,
          count: currentTokensAmount,
        }),
      });

      if (!response.ok) {
        throw new Error(t('payments.purchaseError'));
      }

      addTokens(currentUser._id, currentTokensAmount);

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

  const currentTokensFromState = currentUser.tokens ?? 0;

  return (
    <div id="payments-page-view" className="flex flex-col min-h-screen font-sans bg-brand-canvas text-brand-dark">
      <Header onLogout={handleLogout} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Back Link + Quick Actions */}
        <div className="flex items-center justify-between mb-6">
          <BackToPanelButton />

          <button
            onClick={() => navigate('/token-history')}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-ochre transition-colors cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{t('header.usageHistory')}</span>
          </button>
        </div>

        {successInfo ? (
          /* SUCCESS SCREEN */
          <div className="bg-white border border-brand-border rounded-2xl shadow-xl p-8 text-center max-w-xl mx-auto">
            <div className="mx-auto size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h1 className="text-2xl font-black text-brand-dark tracking-tight text-center font-display">{t('payments.purchaseComplete')}</h1>
            <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center justify-center gap-1.5 bg-emerald-50 max-w-fit mx-auto px-4 py-1.5 rounded-full select-none">
              <Sparkles className="w-4 h-4" />
              {t('payments.tokensCredited', { amount: successInfo.amount })}
            </p>

            <div className="my-8 py-5 border-y border-brand-border text-left space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-muted font-medium">{t('payments.paymentStatus')}</span>
                <span className="text-emerald-600 font-semibold uppercase tracking-tight">{t('payments.confirmed')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-brand-muted font-semibold">{t('payments.totalAmount')}</span>
                <span className="text-sm font-bold text-brand-dark font-mono">R$ {successInfo.price.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-brand-muted font-semibold">{t('payments.newTokenBalance')}</span>
                <span className="text-sm font-black text-brand-ochre flex items-center gap-1 font-mono">
                  <Coins className="w-4 h-4" /> {t('payments.tokensCount', { count: currentTokensFromState })}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-brand-muted leading-relaxed mb-6">
              {t('payments.rechargeSuccess')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSuccessInfo(null)}
                className="flex-1 py-2.5 border border-brand-border hover:bg-brand-panel text-brand-dark text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t('payments.buyMoreTokens')}
              </button>
              <button
                onClick={() => navigate('/customer')}
                className="flex-1 py-2.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white font-bold text-xs rounded-xl hover:-translate-y-0.5 transition cursor-pointer shadow-md shadow-brand-ochre/15"
              >
                {t('payments.backToPanel2')}
              </button>
            </div>
          </div>
        ) : (
          /* CHOOSE TOKEN PACK SCREEN */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Pack Selection */}
            <div className="lg:col-span-7 space-y-6">
              <div className="text-left space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-brand-dark font-display flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-brand-ochre" />
                  {t('payments.buyRechargeTokens')}
                </h1>
                <p className="text-xs text-brand-muted max-w-xl">{t('payments.rechargeHint')}</p>
              </div>

              <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs">

                <p className="text-xs font-bold text-brand-dark uppercase tracking-widest mb-6">
                  {t('payments.selectPackOrCustom')}
                </p>

                {/* Grid of preset packages */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {TOKEN_PACKS.map((pack) => {
                    const isSelected = selectedPack === pack.id;
                    return (
                      <button
                        type="button"
                        key={pack.id}
                        onClick={() => setSelectedPack(pack.id)}
                        className={`relative rounded-2xl p-5 border text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer ${
                          isSelected
                            ? 'border-brand-ochre ring-4 ring-brand-ochre/10 bg-brand-ochre/[0.03]'
                            : 'border-brand-border hover:border-brand-border-dark bg-white'
                        }`}
                      >
                        {/* Selection radio visual */}
                        <div className={`absolute top-4 right-4 size-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-brand-ochre bg-brand-ochre text-white' : 'border-brand-border bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div>
                          <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-panel text-brand-muted mb-3">
                            {pack.badge}
                          </span>
                          <div className={`size-10 rounded-xl bg-gradient-to-br ${pack.color} text-white flex items-center justify-center font-bold text-sm font-mono mb-3`}>
                            +{pack.tokens}
                          </div>
                          <h3 className="text-sm font-bold text-brand-dark leading-tight">{pack.title}</h3>
                          <p className="text-[11px] text-brand-muted mt-2 leading-relaxed">
                            {pack.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-brand-border flex items-baseline justify-between w-full">
                          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">{t('payments.totalValue')}</span>
                          <span className="text-lg font-black text-brand-dark font-mono">R$ {pack.price.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom amount section */}
                <div className="mb-2 p-4 bg-brand-panel/40 border border-brand-border rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSelectedPack('custom')}
                    className="flex items-center gap-2 text-xs font-bold text-brand-dark hover:text-brand-ochre transition-colors mb-4 cursor-pointer"
                  >
                    <div className={`size-4 rounded border flex items-center justify-center transition-colors ${
                      selectedPack === 'custom' ? 'border-brand-ochre bg-brand-ochre' : 'border-brand-border'
                    }`}>
                      {selectedPack === 'custom' && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span>{t('payments.customAmount')}</span>
                  </button>

                  {selectedPack === 'custom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1.5 font-sans">
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
                            className="w-full px-4 py-2.5 border border-brand-border rounded-xl text-sm font-bold focus:outline-hidden focus:border-brand-ochre font-mono text-brand-dark pl-10"
                          />
                          <Coins className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1.5 font-sans">
                          {t('payments.estimatedCost')}
                        </label>
                        <div className="px-4 py-2.5 bg-brand-panel rounded-xl border border-brand-border text-sm font-black text-brand-dark flex items-center justify-between font-mono">
                          <span>{t('payments.price')}</span>
                          <span>R$ {(customTokens * 1.80).toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3.5 bg-brand-panel/40 rounded-xl border border-brand-border text-xs text-brand-dark select-none">
                <Info className="w-4.5 h-4.5 text-brand-ochre shrink-0" />
                <span>{t('payments.callsInfo')}</span>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-5 bg-white border border-brand-border rounded-3xl p-6 shadow-lg space-y-6 text-left lg:sticky lg:top-24">
              <div className="space-y-1 border-b border-brand-border pb-4">
                <h3 className="text-lg font-black text-brand-dark tracking-tight font-display">{t('payments.orderSummary')}</h3>
                <p className="text-xs text-brand-muted">{t('payments.orderSummaryHint')}</p>
              </div>

              <div className="bg-brand-panel/60 border border-brand-border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-white border border-brand-border flex items-center justify-center text-brand-ochre">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">{t('payments.yourBalance')}</p>
                  <p className="text-base font-black text-brand-dark font-mono">{t('payments.tokensCount', { count: currentTokensFromState })}</p>
                </div>
              </div>

              <div className="space-y-3 bg-brand-panel/40 border border-brand-border rounded-2xl p-4 text-xs">
                <div className="flex justify-between items-center text-brand-muted">
                  <span>{t('payments.selectedPackage')}</span>
                  <span className="font-bold text-brand-dark font-mono">{currentTokensAmount} {currentTokensAmount === 1 ? 'token' : 'tokens'}</span>
                </div>
                <div className="h-[1px] bg-brand-border my-1" />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-brand-dark">{t('payments.totalValue')}</span>
                  <span className="font-black text-brand-dark font-mono text-base">R$ {currentPrice.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBuy}
                disabled={isProcessing || currentTokensAmount <= 0}
                className="w-full py-4 bg-brand-ochre hover:bg-brand-ochre-hover disabled:bg-brand-border disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-brand-ochre/15"
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

              <div className="pt-2 border-t border-brand-border flex items-center justify-center gap-4 text-[10px] text-brand-muted">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  {t('payments.encryptedEnvironment')}
                </span>
                <span className="text-brand-border">•</span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {t('payments.secureTransaction')}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};
