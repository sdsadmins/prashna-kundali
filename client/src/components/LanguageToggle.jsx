import { useI18n } from '../i18n/useI18n';

export default function LanguageToggle() {
  const { lang, toggleLang } = useI18n();

  return (
    <button
      onClick={toggleLang}
      className="px-4 py-2 rounded-full border border-gold/40 bg-white/5 hover:bg-white/10 text-gold text-sm font-medium transition-all cursor-pointer"
    >
      {lang === 'en' ? 'मराठी' : 'English'}
    </button>
  );
}
