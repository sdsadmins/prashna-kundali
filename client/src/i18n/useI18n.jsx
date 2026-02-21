import { createContext, useContext, useState } from 'react';
import en from './en.json';
import mr from './mr.json';

const locales = { en, mr };
const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en');

  const t = (key) => locales[lang][key] || key;
  const toggleLang = () => setLang((l) => (l === 'en' ? 'mr' : 'en'));

  return (
    <I18nContext.Provider value={{ lang, setLang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
