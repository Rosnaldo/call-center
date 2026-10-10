import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, type Language } from '@/src/i18n.ts';

// Each language named in itself, so it's recognizable whatever the current one.
const LABELS: Record<Language, string> = {
  pt: 'Português',
  en: 'English',
};

// Header dropdown switching the UI language (saved per browser), styled like
// the profile menu. Texts already in the chat stay in the language they
// arrived in.
export const LanguageSelect: React.FC = () => {
  const { t, i18n } = useTranslation();
  const current = LANGUAGES.find((lang) => i18n.resolvedLanguage === lang) ?? 'en';
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const choose = (lang: Language) => {
    setIsOpen(false);
    setLanguage(lang);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative select-none" ref={containerRef}>
      <button
        id="header-language-trigger"
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t('header.language')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 bg-brand-panel hover:bg-brand-panel/85 border border-brand-border px-2.5 py-1.5 rounded-2xl transition-all text-xs font-bold text-brand-dark hover:text-[#a36500] cursor-pointer focus:outline-none"
      >
        <Globe className="w-3.5 h-3.5 text-brand-muted shrink-0" aria-hidden="true" />
        <span className="uppercase sm:normal-case">
          <span className="sm:hidden">{current}</span>
          <span className="hidden sm:inline">{LABELS[current]}</span>
        </span>
        <ChevronDown
          className={`w-3 h-3 text-brand-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          id="header-language-menu"
          role="listbox"
          aria-label={t('header.language')}
          className="absolute right-0 top-full mt-2.5 w-44 bg-white border border-[#ebdcb9]/50 rounded-[20px] shadow-[0_12px_36px_rgba(163,101,0,0.12),_0_4px_12px_rgba(163,101,0,0.03)] z-50 overflow-hidden font-sans p-1.5 flex flex-col gap-0.5"
        >
          {LANGUAGES.map((lang) => {
            const selected = lang === current;
            return (
              <li key={lang} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => choose(lang)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-xs rounded-xl font-semibold cursor-pointer border-0 transition-all ${
                    selected
                      ? 'bg-brand-panel/60 text-[#a36500]'
                      : 'bg-transparent text-brand-dark hover:text-[#a36500] hover:bg-brand-panel/40'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-6 text-[10px] font-mono font-bold uppercase tracking-wider text-brand-muted">
                      {lang}
                    </span>
                    {LABELS[lang]}
                  </span>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LanguageSelect;
