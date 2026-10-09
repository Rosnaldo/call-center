import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbotStore } from '../../states/stores.ts';
import type { AppSearchResult, ChatbotParams } from '../../states/local/chatbot/state.ts';
import { POPULAR_APPS } from './popular-apps.ts';
import { loadSavedApps } from './saved-allowed-apps.ts';

const MONO = '"JetBrains Mono", Menlo, Consolas, monospace';

const POPULAR_BY_ID = new Map(POPULAR_APPS.map((app) => [app.id, app]));

// The params collected so far in the conversation, opened from the chat header.
// Opened and closed through the chatbot store.
export const SummaryModal: React.FC = () => {
  const isOpen = useChatbotStore((s) => s.isSummaryModalOpen);
  return isOpen ? <Summary /> : null;
};

const Summary: React.FC = () => {
  const { t } = useTranslation();
  const close = useChatbotStore((s) => s.closeSummaryModal);
  const params = useChatbotStore((s) => s.params);
  const searchedApps = useChatbotStore((s) => s.searchedApps);
  // Saved picks cover apps searched before a reload.
  const [knownApps] = useState(() => ({
    ...Object.fromEntries(loadSavedApps().map((app) => [app.id, app])),
    ...searchedApps,
  }));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  return (
    <div
      id="summary-modal"
      className="fixed inset-0 z-[200] bg-brand-dark/35 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title"
        className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: '22px',
          backgroundColor: '#FDFBF7',
          border: '1.5px solid #E4DAC6',
          boxShadow: '0 18px 36px -12px rgba(165, 120, 50, 0.09), 0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-4.5 py-2.5"
          style={{ backgroundColor: '#F5EFE4', borderBottomColor: '#E8DECA', fontFamily: MONO }}
        >
          <h4 id="summary-title" className="flex items-center gap-2 text-[12.5px] font-medium tracking-tight text-[#524A3D]">
            <span className="text-[11px] leading-none" style={{ color: '#B97204' }}>◆</span>
            {t('chatbot.summaryModal.title')}
          </h4>
          <button
            type="button"
            onClick={close}
            aria-label={t('chatbot.summaryModal.close')}
            className="text-[#A09787] hover:text-[#524A3D] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <dl className="flex-1 overflow-y-auto overscroll-contain p-4.5 flex flex-col gap-3.5 text-left" style={{ backgroundColor: '#FAF7F1' }}>
          <Row label={t('chatbot.summary.os')} value={params?.os} />
          <Row label={t('chatbot.summary.version')} value={params?.version} />
          <Row label={t('chatbot.summary.privateDns')} value={privateDnsText(params, t)} />
          <div>
            <Label>{t('chatbot.summaryModal.allowedApps')}</Label>
            <dd className="mt-1.5">
              <AllowedApps ids={params?.allowedApps ?? null} knownApps={knownApps} />
            </dd>
          </div>
          <Row label={t('chatbot.summary.installOs')} value={params?.installOs} />
        </dl>
      </div>
    </div>
  );
};

type T = ReturnType<typeof useTranslation>['t'];

const privateDnsText = (params: ChatbotParams | null, t: T): string | null => {
  if (!params || params.privateDns === null) return null;
  if (!params.privateDns) return t('chatbot.choices.no');
  // Answered yes, hostname still to come.
  return params.privateDnsHost ?? t('chatbot.choices.yes');
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <dt className="text-[11px] uppercase tracking-wider font-semibold text-[#857967]" style={{ fontFamily: MONO }}>
    {children}
  </dt>
);

const Pending: React.FC = () => {
  const { t } = useTranslation();
  return <span className="text-[14px] italic text-[#A09787]">{t('chatbot.summaryModal.pending')}</span>;
};

const Row: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => (
  <div>
    <Label>{label}</Label>
    <dd className="mt-0.5 text-[14px] text-[#1E1913]">{value ?? <Pending />}</dd>
  </div>
);

const AllowedApps: React.FC<{ ids: string[] | null; knownApps: Record<string, AppSearchResult> }> = ({
  ids,
  knownApps,
}) => {
  const { t } = useTranslation();
  if (ids === null) return <Pending />;
  if (!ids.length) return <span className="text-[14px] text-[#1E1913]">{t('chatbot.summaryModal.noApps')}</span>;
  // Names only; the id stands in for an app never seen in this browser.
  return (
    <ul className="flex flex-col gap-0.5 text-[14px] text-[#1E1913]">
      {ids.map((id) => (
        <li key={id}>{(POPULAR_BY_ID.get(id) ?? knownApps[id])?.name ?? id}</li>
      ))}
    </ul>
  );
};

export default SummaryModal;
