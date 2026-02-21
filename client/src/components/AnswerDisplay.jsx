import { useI18n } from '../i18n/useI18n';

function getOrdinalEn(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getOrdinalMr(n) {
  const map = { 1: '१ली', 2: '२री', 3: '३री', 4: '४थी', 5: '५वी', 6: '६वी', 7: '७वी', 8: '८वी', 9: '९वी', 10: '१०वी', 11: '११वी', 12: '१२वी' };
  return map[n] || `${n}वी`;
}

export default function AnswerDisplay({ calculation, options, question }) {
  const { t, lang } = useI18n();

  if (!calculation) return null;

  const answerIdx = calculation.answerOption - 1;
  const answerText = options[answerIdx] || `${getOrdinalEn(calculation.answerOption)} ${t('preference')}`;

  const getLabel = (i) => {
    const num = i + 1;
    if (lang === 'mr') return `${getOrdinalMr(num)} पसंती`;
    return `${getOrdinalEn(num)} Preference`;
  };

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
          {t('answerIs')} — {getLabel(answerIdx)}
        </span>
        <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-saffron">
          {answerText}
        </div>
      </div>

      {/* All preferences with answer highlighted */}
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
            <div className="flex flex-col items-start">
              <span className={`text-xs ${i === answerIdx ? 'text-gold/60' : 'text-white/20'}`}>
                {getLabel(i)}
              </span>
              <span className={i === answerIdx ? 'text-gold font-medium' : 'text-white/40'}>
                {opt}
              </span>
            </div>
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
