import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';

export default function QuestionForm({ onCalculate, isLoading }) {
  const { t, lang } = useI18n();
  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState('yesno');
  const [options, setOptions] = useState([
    lang === 'mr' ? 'हो' : 'Yes',
    lang === 'mr' ? 'नाही' : 'No',
  ]);

  // Update yes/no labels when language changes
  useEffect(() => {
    if (questionType === 'yesno') {
      setOptions([lang === 'mr' ? 'हो' : 'Yes', lang === 'mr' ? 'नाही' : 'No']);
    }
  }, [lang, questionType]);

  const handleTypeChange = (type) => {
    setQuestionType(type);
    if (type === 'yesno') {
      setOptions([lang === 'mr' ? 'हो' : 'Yes', lang === 'mr' ? 'नाही' : 'No']);
    } else {
      setOptions(['', '', '']);
    }
  };

  const addOption = () => {
    if (options.length < 12) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  // Check if all options are filled (for multi-choice)
  const allOptionsFilled = questionType === 'yesno' || options.every((o) => o.trim());

  const handleSubmit = () => {
    if (!question.trim() || !allOptionsFilled) return;
    const filledOptions = options.map((o, i) =>
      o.trim() || `${t('optionPlaceholder')} ${i + 1}`
    );
    onCalculate({ question, options: filledOptions, optionsCount: filledOptions.length });
  };

  return (
    <div className="card-glass p-6 space-y-5">
      {/* Question Input */}
      <div>
        <label className="block text-gold text-sm font-medium mb-2">
          {t('questionLabel')}
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('questionPlaceholder')}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:border-gold/50 focus:outline-none resize-none"
          rows={2}
        />
      </div>

      {/* Question Type */}
      <div>
        <label className="block text-gold text-sm font-medium mb-2">
          {t('questionType')}
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => handleTypeChange('yesno')}
            className={`px-4 py-2 rounded-lg text-sm transition-all cursor-pointer ${
              questionType === 'yesno'
                ? 'bg-gold/20 border-gold text-gold border'
                : 'bg-white/5 border-white/10 text-white/60 border hover:bg-white/10'
            }`}
          >
            {t('yesNo')}
          </button>
          <button
            onClick={() => handleTypeChange('multi')}
            className={`px-4 py-2 rounded-lg text-sm transition-all cursor-pointer ${
              questionType === 'multi'
                ? 'bg-gold/20 border-gold text-gold border'
                : 'bg-white/5 border-white/10 text-white/60 border hover:bg-white/10'
            }`}
          >
            {t('multipleChoice')}
          </button>
        </div>
      </div>

      {/* Options */}
      <div>
        <label className="block text-gold text-sm font-medium mb-2">
          {t('optionsLabel')} ({options.length})
          {questionType === 'multi' && !allOptionsFilled && (
            <span className="ml-2 text-saffron/70 text-xs font-normal">
              {lang === 'mr' ? '— सर्व पर्याय भरा' : '— fill all options'}
            </span>
          )}
        </label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                opt.trim()
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-white/5 text-white/30 border border-white/10'
              }`}>
                {i + 1}
              </span>
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={
                  questionType === 'yesno'
                    ? (i === 0 ? (lang === 'mr' ? 'हो' : 'Yes') : (lang === 'mr' ? 'नाही' : 'No'))
                    : `${t('optionPlaceholder')} ${i + 1} — ${lang === 'mr' ? 'नाव लिहा' : 'enter name'}`
                }
                disabled={questionType === 'yesno'}
                className={`flex-1 border rounded-lg px-3 py-2 text-white placeholder-white/30 focus:border-gold/50 focus:outline-none text-sm transition-all ${
                  questionType === 'yesno'
                    ? 'bg-white/3 border-white/5 opacity-70'
                    : opt.trim()
                      ? 'bg-white/8 border-gold/30'
                      : 'bg-white/5 border-white/10'
                }`}
              />
              {questionType === 'multi' && options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-red-400/10 text-red-400/50 hover:text-red-400 hover:bg-red-400/20 flex items-center justify-center text-xs cursor-pointer transition-all"
                  title={t('removeOption')}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {questionType === 'multi' && options.length < 12 && (
          <button
            onClick={addOption}
            className="mt-3 w-full py-2 rounded-lg border border-dashed border-gold/20 text-gold/50 hover:text-gold hover:border-gold/40 text-sm cursor-pointer transition-all"
          >
            {t('addOption')}
          </button>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !question.trim() || !allOptionsFilled}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-gold/80 to-saffron/80 text-black font-bold text-lg hover:from-gold hover:to-saffron transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer pulse-glow"
      >
        {isLoading ? t('calculating') : t('showKundali')}
      </button>
    </div>
  );
}
