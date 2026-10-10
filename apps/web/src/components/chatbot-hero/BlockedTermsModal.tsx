import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbotStore } from '../../states/stores.ts';

const MONO = '"JetBrains Mono", Menlo, Consolas, monospace';
const SCROLLBAR =
  '[scrollbar-width:thin] [scrollbar-color:#D9C9A8_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9C9A8] [&::-webkit-scrollbar-track]:bg-transparent';

// Same rule the backend validates each word with (parseBlockedTermsList):
// 2-40 letters/digits/._- , no spaces (it's matched inside URLs).
const TERM = /^[\p{L}\p{N}._-]{2,40}$/u;
export const normalizeTerm = (raw: string): string => raw.trim().toLowerCase();
export const isValidTerm = (term: string): boolean => TERM.test(term);

interface BlockedTermsModalProps {
  // Sends the words to the bot; false when they couldn't be sent.
  onSubmit: (terms: string[]) => boolean;
}

// Tag input answering the bot's "add forbidden words" request. Opened and
// closed through the chatbot store (the bot opens it over the ws).
export const BlockedTermsModal: React.FC<BlockedTermsModalProps> = ({ onSubmit }) => {
  const isOpen = useChatbotStore((s) => s.isBlockedTermsModalOpen);
  // Mounted only while open, so every opening starts empty.
  return isOpen ? <TermsEditor onSubmit={onSubmit} /> : null;
};

const TermsEditor: React.FC<BlockedTermsModalProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const close = useChatbotStore((s) => s.closeBlockedTermsModal);
  const [terms, setTerms] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  const addDraft = () => {
    const term = normalizeTerm(draft);
    if (!term) return;
    if (!isValidTerm(term)) {
      setError(t('chatbot.blockedTermsModal.invalid'));
      return;
    }
    if (terms.includes(term)) {
      setError(t('chatbot.blockedTermsModal.duplicate'));
      return;
    }
    setTerms((prev) => [...prev, term]);
    setDraft('');
    setError(null);
  };

  const removeTerm = (term: string) => setTerms((prev) => prev.filter((t2) => t2 !== term));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter or comma commits the current word.
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addDraft();
    } else if (e.key === 'Backspace' && !draft && terms.length) {
      removeTerm(terms[terms.length - 1]);
    }
  };

  const handleSubmit = () => {
    // Fold in a word still being typed, so a forgotten Enter isn't lost.
    const pending = normalizeTerm(draft);
    const all = pending && isValidTerm(pending) && !terms.includes(pending) ? [...terms, pending] : terms;
    onSubmit(all);
  };

  return (
    <div
      id="blocked-terms-modal"
      className="fixed inset-0 z-[200] bg-brand-dark/35 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-terms-title"
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
          <h4 id="blocked-terms-title" className="flex items-center gap-2 text-[12.5px] font-medium tracking-tight text-[#524A3D]">
            <span className="text-[11px] leading-none" style={{ color: '#B97204' }}>◆</span>
            {t('chatbot.blockedTermsModal.title')}
          </h4>
        </div>

        <div className="px-3 pt-3" style={{ backgroundColor: '#FAF7F1' }}>
          <p className="px-1 pb-2 text-[12px] text-[#857967] text-left" style={{ fontFamily: MONO }}>
            {t('chatbot.blockedTermsModal.hint')}
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E4D9C4] bg-white focus-within:border-[#B97204]">
            <input
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('chatbot.blockedTermsModal.inputPlaceholder')}
              aria-label={t('chatbot.blockedTermsModal.inputLabel')}
              maxLength={40}
              autoFocus
              className="w-full bg-transparent border-none outline-none text-[14px] text-[#1F1A13] placeholder-[#A09787] p-0 focus:ring-0"
            />
            <button
              type="button"
              onClick={addDraft}
              aria-label={t('chatbot.blockedTermsModal.add')}
              className="shrink-0 text-[#B97204] hover:text-[#8f5803] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {error && (
            <p role="alert" className="pt-2 px-1 text-[12px] text-[#B23D2B] text-left" style={{ fontFamily: MONO }}>
              {error}
            </p>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto overscroll-contain ${SCROLLBAR} p-3`} style={{ backgroundColor: '#FAF7F1' }}>
          {terms.length === 0 ? (
            <p className="text-center py-8 text-[13px] text-[#A09787]">{t('chatbot.blockedTermsModal.empty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {terms.map((term) => (
                <li key={term}>
                  <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-white border border-[#E4D9C4] text-[13px] text-[#1E1913]">
                    <span className="font-mono-terminal">{term}</span>
                    <button
                      type="button"
                      onClick={() => removeTerm(term)}
                      aria-label={t('chatbot.blockedTermsModal.remove', { term })}
                      className="shrink-0 text-[#A09787] hover:text-[#524A3D] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4.5 py-3.5 bg-white border-t border-[#E8DECA]">
          <span className="text-[12px] text-[#857967]" style={{ fontFamily: MONO }}>
            {t('chatbot.blockedTermsModal.count', { count: terms.length })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 rounded-[10px] border border-[#E4D9C4] text-[#524A3D] text-[12px] uppercase font-semibold tracking-wider cursor-pointer hover:bg-[#FAF7F1]"
              style={{ fontFamily: MONO }}
            >
              {t('chatbot.blockedTermsModal.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-[10px] text-white text-[12px] uppercase font-bold tracking-wider cursor-pointer active:scale-[0.98]"
              style={{ backgroundColor: '#B97204', boxShadow: '0 3px 12px -1px rgba(185, 114, 4, 0.38)', fontFamily: MONO }}
            >
              {t('chatbot.blockedTermsModal.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedTermsModal;
