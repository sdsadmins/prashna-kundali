import { useI18n } from '../i18n/useI18n';

export default function AnswerDisplay({ calculation, options, question }) {
  const { t, lang } = useI18n();

  if (!calculation) return null;

  const answerIdx = calculation.answerOption - 1;
  const answerText = options[answerIdx] || `${t('optionPlaceholder')} ${calculation.answerOption}`;

  return (
    <div
      className="card-glass p-8 text-center animate-fade-in-up pulse-glow"
      style={{ animationDelay: '1.2s' }}
    >
      <h3 className="text-gold glow-text text-lg font-bold mb-4 flex items-center justify-center gap-2">
        <span className="text-2xl">&#10024;</span>
        {t('answerTitle')}
        <span className="text-2xl">&#10024;</span>
      </h3>

      {/* Original question */}
      <div className="mb-4 px-4 py-3 bg-white/3 rounded-lg border border-white/5">
        <span className="text-white/40 text-xs block mb-1">
          {lang === 'mr' ? 'प्रश्न' : 'Question'}
        </span>
        <p className="text-white/80 text-base italic">"{question}"</p>
      </div>

      {/* Answer */}
      <div className="mb-4">
        <span className="text-white/50 text-sm block mb-1">
          {t('answerIs')} {calculation.answerOption}
        </span>
        <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-saffron">
          {answerText}
        </div>
      </div>

      {/* All options with answer highlighted */}
      <div className="mt-6 space-y-2">
        {options.map((opt, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
              i === answerIdx
                ? 'bg-gold/20 border border-gold/50'
                : 'bg-white/3 border border-white/5'
            }`}
          >
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              i === answerIdx
                ? 'bg-gold text-black'
                : 'bg-white/10 text-white/40'
            }`}>
              {i + 1}
            </span>
            <span className={i === answerIdx ? 'text-gold font-medium' : 'text-white/40'}>
              {opt}
            </span>
            {i === answerIdx && (
              <span className="ml-auto text-gold text-lg">&#10004;</span>
            )}
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div className="mt-4 text-xs text-white/30">
        {lang === 'mr' ? calculation.answerExplanation.mr : calculation.answerExplanation.en}
      </div>
    </div>
  );
}
