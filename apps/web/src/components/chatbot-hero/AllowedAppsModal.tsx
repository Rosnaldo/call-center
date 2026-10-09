import React, { useEffect, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbotStore } from '../../states/stores.ts';
import { normalizeSearchTerm } from '../../services/ws/chatbot-ws.ts';
import { POPULAR_APPS, POPULAR_CATEGORIES, type PopularApp } from './popular-apps.ts';
import AppIcon from './AppIcon.tsx';
import { loadSavedApps, saveApps } from './saved-allowed-apps.ts';

const MONO = '"JetBrains Mono", Menlo, Consolas, monospace';
const SEARCH_DEBOUNCE_MS = 300;

const POPULAR_IDS = new Set(POPULAR_APPS.map((app) => app.id));
const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-2';

// A checklist row: a popular app or a Google Play search result (same shape).
type ListedApp = PopularApp;

interface AllowedAppsModalProps {
  // Sends the picked app ids to the bot; false when they couldn't be sent.
  onSubmit: (apps: string[]) => boolean;
  // Google Play search; results come back through the chatbot store.
  onSearch: (term: string) => void;
}

// Checklist of popular apps, plus a Google Play search, answering the bot's
// allowed app list question. Opened and closed through the chatbot store (the
// bot opens it over the ws). Starts with the list last sent checked, saved in
// the browser.
export const AllowedAppsModal: React.FC<AllowedAppsModalProps> = (props) => {
  const isOpen = useChatbotStore((s) => s.isAllowedAppsModalOpen);
  // Mounted only while open, so every opening starts from the saved list.
  return isOpen ? <AllowedAppsChecklist {...props} /> : null;
};

const AllowedAppsChecklist: React.FC<AllowedAppsModalProps> = ({ onSubmit, onSearch }) => {
  const { t } = useTranslation();
  const close = useChatbotStore((s) => s.closeAllowedAppsModal);
  const search = useChatbotStore((s) => s.appSearch);
  // Keeps name and icon too, so apps picked from a search stay listed after it's cleared.
  const [selected, setSelected] = useState<Map<string, ListedApp>>(
    () => new Map(loadSavedApps().map((app) => [app.id, app])),
  );
  const [query, setQuery] = useState('');
  const isSearching = normalizeSearchTerm(query) !== null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  useEffect(() => {
    const timer = setTimeout(() => onSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const toggle = (app: ListedApp) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(app.id)) next.delete(app.id);
      else next.set(app.id, app);
      return next;
    });

  const allSelected = (apps: ListedApp[]) => apps.every((app) => selected.has(app.id));
  // Checks the whole group, or unchecks it when it's all checked already.
  const toggleGroup = (apps: ListedApp[]) => {
    const uncheck = allSelected(apps);
    setSelected((prev) => {
      const next = new Map(prev);
      for (const app of apps) {
        if (uncheck) next.delete(app.id);
        else next.set(app.id, app);
      }
      return next;
    });
  };

  const searchedApps = [...selected.values()].filter((app) => !POPULAR_IDS.has(app.id));
  // Picked search results get their own group, so they stay visible after the search.
  const groups = searchedApps.length
    ? [{ name: t('chatbot.allowedApps.fromSearch'), apps: searchedApps }, ...POPULAR_CATEGORIES]
    : POPULAR_CATEGORIES;
  const renderRow = (app: ListedApp) => (
    <ChecklistRow key={app.id} app={app} checked={selected.has(app.id)} onToggle={() => toggle(app)} />
  );

  // Popular apps in checklist order, then searched ones in the order they were picked.
  const handleSubmit = () => {
    const picked = [...POPULAR_APPS.filter((app) => selected.has(app.id)), ...searchedApps];
    if (onSubmit(picked.map((app) => app.id))) saveApps(picked);
  };

  return (
    <div
      id="allowed-apps-modal"
      className="fixed inset-0 z-[200] bg-brand-dark/35 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="allowed-apps-title"
        className="w-full max-w-lg h-[85vh] max-h-[640px] flex flex-col overflow-hidden"
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
          <h4 id="allowed-apps-title" className="flex items-center gap-2 text-[12.5px] font-medium tracking-tight text-[#524A3D]">
            <span className="text-[11px] leading-none" style={{ color: '#B97204' }}>◆</span>
            {t('chatbot.allowedApps.title')}
          </h4>
          {!isSearching && (
            <button
              type="button"
              onClick={() => toggleGroup(POPULAR_APPS)}
              className="text-[11px] uppercase tracking-wider font-semibold text-[#B97204] hover:underline cursor-pointer"
              style={{ fontFamily: MONO }}
            >
              {allSelected(POPULAR_APPS) ? t('chatbot.allowedApps.clearAll') : t('chatbot.allowedApps.selectAll')}
            </button>
          )}
        </div>

        <div className="px-3 pt-3" style={{ backgroundColor: '#FAF7F1' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E4D9C4] bg-white focus-within:border-[#B97204]">
            {search.status === 'loading' ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#B97204]" />
            ) : (
              <Search className="w-4 h-4 shrink-0 text-[#A09787]" />
            )}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('chatbot.allowedApps.searchPlaceholder')}
              aria-label={t('chatbot.allowedApps.searchLabel')}
              maxLength={50}
              autoFocus
              className="w-full bg-transparent border-none outline-none text-[14px] text-[#1F1A13] placeholder-[#A09787] p-0 focus:ring-0 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('chatbot.allowedApps.clearSearch')}
                className="shrink-0 text-[#A09787] hover:text-[#524A3D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {isSearching && <SearchStatus status={search.status} hasResults={search.results.length > 0} />}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-4" style={{ backgroundColor: '#FAF7F1' }}>
          {isSearching ? (
            <ul className={GRID}>{search.results.map(renderRow)}</ul>
          ) : (
            groups.map((group) => (
              <section key={group.name} aria-label={group.name}>
                <div className="flex items-center justify-between gap-2 px-1 pb-2">
                  <h5 className="text-[11px] uppercase tracking-wider font-semibold text-[#857967]" style={{ fontFamily: MONO }}>
                    {group.name}
                    <span className="ml-1.5 font-normal text-[#A09787]">
                      {group.apps.filter((app) => selected.has(app.id)).length}/{group.apps.length}
                    </span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.apps)}
                    aria-label={t(allSelected(group.apps) ? 'chatbot.allowedApps.uncheckGroup' : 'chatbot.allowedApps.checkGroup', { group: group.name })}
                    className="text-[11px] text-[#B97204] hover:underline cursor-pointer"
                    style={{ fontFamily: MONO }}
                  >
                    {allSelected(group.apps) ? t('chatbot.allowedApps.uncheck') : t('chatbot.allowedApps.checkAll')}
                  </button>
                </div>
                <ul className={GRID}>{group.apps.map(renderRow)}</ul>
              </section>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4.5 py-3.5 bg-white border-t border-[#E8DECA]">
          <span className="text-[12px] text-[#857967]" style={{ fontFamily: MONO }}>
            {t('chatbot.allowedApps.selected', { count: selected.size })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 rounded-[10px] border border-[#E4D9C4] text-[#524A3D] text-[12px] uppercase font-semibold tracking-wider cursor-pointer hover:bg-[#FAF7F1]"
              style={{ fontFamily: MONO }}
            >
              {t('chatbot.allowedApps.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-[10px] text-white text-[12px] uppercase font-bold tracking-wider cursor-pointer active:scale-[0.98]"
              style={{ backgroundColor: '#B97204', boxShadow: '0 3px 12px -1px rgba(185, 114, 4, 0.38)', fontFamily: MONO }}
            >
              {t('chatbot.allowedApps.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchStatus: React.FC<{ status: string; hasResults: boolean }> = ({ status, hasResults }) => {
  const { t } = useTranslation();
  let text: string | null = null;
  if (status === 'error') text = t('chatbot.allowedApps.searchError');
  else if (status === 'done' && !hasResults) text = t('chatbot.allowedApps.noResults');
  else if (status === 'loading' && !hasResults) text = t('chatbot.allowedApps.searching');
  if (!text) return null;
  return (
    <p role="status" className="pt-3 px-1 text-[12px] text-[#857967] text-left" style={{ fontFamily: MONO }}>
      {text}
    </p>
  );
};

const ChecklistRow: React.FC<{ app: ListedApp; checked: boolean; onToggle: () => void }> = ({
  app,
  checked,
  onToggle,
}) => (
  <li>
    <label
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
        checked ? 'bg-white border-[#B97204]' : 'bg-white border-[#E4D9C4] hover:border-[#D2BE97]'
      }`}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      <span
        aria-hidden="true"
        className={`w-4.5 h-4.5 shrink-0 rounded-[5px] border flex items-center justify-center ${
          checked ? 'bg-[#B97204] border-[#B97204]' : 'bg-white border-[#CFC2A8]'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
      <AppIcon url={app.iconUrl} name={app.name} />
      <span className="min-w-0 flex flex-col text-left">
        <span className="text-[14px] text-[#1E1913] truncate">{app.name}</span>
        <span className="text-[11px] text-[#857967] truncate" style={{ fontFamily: MONO }}>
          {app.id}
        </span>
      </span>
    </label>
  </li>
);

export default AllowedAppsModal;
