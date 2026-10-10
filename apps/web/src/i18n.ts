import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import properties from './properties';
import en from './locales/en.json';
import pt from './locales/pt.json';

export const LANGUAGES = ['pt', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

// The language picked in the header, kept per browser.
const STORAGE_KEY = 'lang';

const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language);

// Storage can be blocked (private mode, disabled site data).
const savedLanguage = (): Language | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
};

export const setLanguage = (lang: Language): void => {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not saved; the next visit starts with the default.
  }
  void i18n.changeLanguage(lang);
};

i18n.on('languageChanged', (lang) => {
  document.documentElement.lang = lang;
});

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: savedLanguage() ?? properties.lang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
