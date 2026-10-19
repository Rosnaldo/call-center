import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbotParamsStore, useChatbotStore } from '../../states/stores.ts';
import type { AppSearchResult } from '../../states/local/chatbot/state.ts';
import type { ChatbotParams, WeekSchedule } from '../../states/local/chatbot-params/state.ts';
import { POPULAR_APPS } from './popular-apps.ts';
import { loadSavedApps } from './saved-allowed-apps.ts';
import { groupDays } from './app-schedules.ts';

const MONO = '"JetBrains Mono", Menlo, Consolas, monospace';

const POPULAR_BY_ID = new Map(POPULAR_APPS.map((app) => [app.id, app]));

const hasAny = (params: ChatbotParams | null): boolean => !!params && Object.values(params).some((value) => value !== null);

// The params collected so far in the conversation, opened from the chat header,
// or the ones the modal was opened with (the kept configuration). Until the
// conversation collects any, the kept ones show.
// Opened and closed through the chatbot store.
export const SummaryModal: React.FC = () => {
  const isOpen = useChatbotStore((s) => s.isSummaryModalOpen);
  return isOpen ? <Summary /> : null;
};

const Summary: React.FC = () => {
  const { t } = useTranslation();
  const close = useChatbotStore((s) => s.closeSummaryModal);
  const summaryParams = useChatbotStore((s) => s.summaryParams);
  const conversationParams = useChatbotParamsStore((s) => (hasAny(s.params) ? s.params : (s.savedParams ?? s.params)));
  const params = summaryParams ?? conversationParams;
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

        <dl className="flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#D9C9A8_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9C9A8] [&::-webkit-scrollbar-track]:bg-transparent p-4.5 flex flex-col gap-3.5 text-left" style={{ backgroundColor: '#FAF7F1' }}>
          <Row label={t('chatbot.summary.os')} value={params?.os} />
          <Row label={t('chatbot.summary.version')} value={params?.version} />
          <Row label={t('chatbot.summary.privateDns')} value={privateDnsText(params, t)} />
          <Collapsible label={t('chatbot.summaryModal.allowedApps')} count={params?.allowedApps?.length ?? null}>
            <AllowedApps ids={params?.allowedApps ?? null} knownApps={knownApps} />
          </Collapsible>
          {/* Only once the bot has asked for them (absent before). */}
          {params?.appSchedules !== undefined && (
            <Collapsible label={t('chatbot.summary.appSchedules')} count={params.appSchedules ? Object.keys(params.appSchedules).length : null}>
              <AppSchedules schedules={params.appSchedules} knownApps={knownApps} />
            </Collapsible>
          )}
          <Row label={t('chatbot.summary.blockRawIp')} value={boolText(params?.blockRawIp, t)} />
          <Collapsible label={t('chatbot.summary.blockedTerms')} count={params?.blockedTerms?.length ?? null}>
            <span className="text-[14px] text-[#1E1913]">{blockedTermsText(params, t)}</span>
          </Collapsible>
          <Row label={t('chatbot.summary.installOs')} value={params?.installOs} />
          <Row label={t('chatbot.summary.appVersion')} value={params?.appVersion} />
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

const boolText = (value: boolean | null | undefined, t: T): string | null =>
  value === null || value === undefined ? null : t(value ? 'chatbot.summary.yes' : 'chatbot.summary.no');

const blockedTermsText = (params: ChatbotParams | null, t: T): string | null => {
  const terms = params?.blockedTerms;
  if (!terms) return null;
  return terms.length ? terms.join(', ') : t('chatbot.summary.none');
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

// A list's entry, closed until clicked: its label and how many items it holds.
// Not answered yet (null), it reads "pending" and doesn't open.
const Collapsible: React.FC<{ label: string; count: number | null; children: React.ReactNode }> = ({ label, count, children }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (count === null) return <Row label={label} value={null} />;
  return (
    <div>
      <dt>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-2 text-left cursor-pointer text-[11px] uppercase tracking-wider font-semibold text-[#857967] hover:text-[#524A3D]"
          style={{ fontFamily: MONO }}
        >
          <span>
            {label} ({count})
          </span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </dt>
      {open && (
        <dd id={id} className="mt-1.5">
          {children}
        </dd>
      )}
    </div>
  );
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

// Each restricted app by name, and its days grouped by identical ranges.
const AppSchedules: React.FC<{ schedules: ChatbotParams['appSchedules']; knownApps: Record<string, AppSearchResult> }> = ({
  schedules,
  knownApps,
}) => {
  const { t } = useTranslation();
  if (!schedules) return <Pending />;
  const apps = Object.keys(schedules);
  if (!apps.length) return <span className="text-[14px] text-[#1E1913]">{t('chatbot.summary.appSchedulesNone')}</span>;
  return (
    <ul className="flex flex-col gap-2 text-[14px] text-[#1E1913]">
      {apps.map((id) => (
        <li key={id}>
          <span>{(POPULAR_BY_ID.get(id) ?? knownApps[id])?.name ?? id}</span>
          <ul className="mt-0.5 pl-3 flex flex-col text-[13px] text-[#524A3D]" style={{ fontFamily: MONO }}>
            {weekLines(schedules[id], t).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};

const weekLines = (week: WeekSchedule, t: T): string[] => {
  const groups = groupDays(week);
  const rangesOf = (ranges: { start: string; end: string }[]) =>
    ranges.length ? ranges.map(({ start, end }) => `${start}–${end}`).join(', ') : t('chatbot.appSchedulesModal.blocked');
  if (groups.length === 1) {
    return [groups[0].ranges.length ? `${t('chatbot.appSchedulesModal.everyDay')}: ${rangesOf(groups[0].ranges)}` : t('chatbot.summary.blockedAllWeek')];
  }
  // Days with times first, then the blocked ones.
  return [...groups]
    .sort((a, b) => Number(!a.ranges.length) - Number(!b.ranges.length))
    .map(({ days, ranges }) => {
      const names = days.map((day) => t(`chatbot.appSchedulesModal.daysShort.${day}`)).join(', ');
      return `${names}: ${rangesOf(ranges)}`;
    });
};

export default SummaryModal;
