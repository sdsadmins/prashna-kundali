import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';

const QUESTION_CATEGORIES = [
  { key: 'general', en: 'General', mr: 'सामान्य' },
  { key: 'marriage', en: 'Marriage', mr: 'विवाह' },
  { key: 'finance', en: 'Finance / Money', mr: 'आर्थिक' },
  { key: 'job', en: 'Job / Career', mr: 'नोकरी' },
  { key: 'promotion', en: 'Promotion', mr: 'पदोन्नती' },
  { key: 'health', en: 'Health / Recovery', mr: 'आरोग्य' },
  { key: 'education', en: 'Education', mr: 'शिक्षण' },
  { key: 'travel', en: 'Travel', mr: 'प्रवास' },
  { key: 'property', en: 'Property / House', mr: 'मालमत्ता' },
  { key: 'vehicle', en: 'Vehicle', mr: 'वाहन' },
  { key: 'children', en: 'Children', mr: 'अपत्य' },
  { key: 'legal', en: 'Legal / Court', mr: 'कायदेशीर' },
  { key: 'love', en: 'Love / Romance', mr: 'प्रेम' },
  { key: 'business', en: 'Business', mr: 'व्यवसाय' },
  { key: 'lost_item', en: 'Lost Item', mr: 'हरवलेली वस्तू' },
  { key: 'election', en: 'Election / Competition', mr: 'निवडणूक' },
];

export default function QuestionForm({ onCalculate, isLoading, initialMode, onModeChange }) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState(initialMode || 'ank');

  const handleModeChange = (m) => {
    setMode(m);
    onModeChange?.(m);
  };
  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState('yesno');
  const [options, setOptions] = useState([
    lang === 'mr' ? 'हो' : 'Yes',
    lang === 'mr' ? 'नाही' : 'No',
  ]);
  const [horaryNumber, setHoraryNumber] = useState('');
  const [questionCategory, setQuestionCategory] = useState('general');
  const [kpQuestionType, setKpQuestionType] = useState('yesno');

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
    if (options.length < 12) setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const allOptionsFilled = questionType === 'yesno' || options.every((o) => o.trim());

  const handleSubmit = () => {
    if (!question.trim()) return;
    if (mode === 'kp') {
      const num = parseInt(horaryNumber);
      if (!num || num < 1 || num > 249) return;
      onCalculate({ question, mode: 'kp', horaryNumber: num, questionCategory, kpQuestionType });
    } else {
      if (!allOptionsFilled) return;
      const filledOptions = options.map((o, i) => o.trim() || `${t('optionPlaceholder')} ${i + 1}`);
      onCalculate({ question, options: filledOptions, optionsCount: filledOptions.length, mode: 'ank' });
    }
  };

  const isSubmitDisabled = isLoading || !question.trim() ||
    (mode === 'ank' && !allOptionsFilled) ||
    (mode === 'kp' && (!horaryNumber || parseInt(horaryNumber) < 1 || parseInt(horaryNumber) > 249));

  return (
    <div className="card-glass p-6 space-y-5">
      {/* Mode Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        <button
          onClick={() => handleModeChange('ank')}
          className={`flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer ${
            mode === 'ank'
              ? 'bg-gold/20 text-gold border-r border-gold/30'
              : 'bg-white/5 text-white/50 border-r border-white/10 hover:bg-white/10'
          }`}
        >
          {lang === 'mr' ? 'अंक शास्त्र' : 'Ank Shastra'}
        </button>
        <button
          onClick={() => handleModeChange('kp')}
          className={`flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer ${
            mode === 'kp'
              ? 'bg-purple-500/20 text-purple-300 border-l border-purple-500/30'
              : 'bg-white/5 text-white/50 border-l border-white/10 hover:bg-white/10'
          }`}
        >
          {lang === 'mr' ? 'केपी होरारी' : 'KP Horary'}
        </button>
      </div>

      {/* Question Input */}
      <div>
        <label className="block text-gold text-sm font-medium mb-2">{t('questionLabel')}</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('questionPlaceholder')}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:border-gold/50 focus:outline-none resize-none"
          rows={2}
        />
      </div>

      {/* KP Mode: Horary Number + Category */}
      {mode === 'kp' && (
        <>
          <div>
            <label className="flex items-center gap-2 text-purple-300 text-sm font-medium mb-2">
              {lang === 'mr' ? 'होरारी क्रमांक (1-249)' : 'Horary Number (1-249)'}
              <span className="relative group cursor-help">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-purple-400/50 text-purple-300 text-[10px] leading-none select-none">?</span>
                <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-80 bg-[#1a1025] border border-purple-500/30 rounded-xl shadow-2xl p-4 text-xs text-white/80 leading-relaxed">
                  <div className="text-purple-300 font-semibold mb-2">
                    {lang === 'mr' ? 'प्रश्न कधी विचारावा?' : 'When to Ask a Question?'}
                  </div>
                  <div className="space-y-2">
                    <p><span className="text-purple-200 font-medium">{lang === 'mr' ? 'KP पद्धती:' : 'KP System:'}</span>{' '}{lang === 'mr' ? 'दिवसाची वेळ, वार किंवा तिथी यांचे कोणतेही बंधन नाही. न्यायाधीशाच्या वेळेत सत्य प्रकट होते.' : 'No restrictions on time of day, day of week, or lunar phase. Truth reveals itself through the Ruling Planets at the moment of judgment.'}</p>
                    <p><span className="text-purple-200 font-medium">{lang === 'mr' ? 'परंपरागत नियम (ज्योतिष ग्रंथ):' : 'Traditional rules (classic texts):'}</span></p>
                    <ul className="list-disc pl-3 space-y-1 text-white/60">
                      <li>{lang === 'mr' ? 'सकाळची वेळ उत्तम; दुपार, संध्याकाळ, रात्र टाळावी' : 'Morning preferred; avoid afternoon, twilight & night'}</li>
                      <li>{lang === 'mr' ? 'पूर्व किंवा उत्तर दिशेकडे तोंड करून विचारावे' : 'Face east or north when asking'}</li>
                      <li>{lang === 'mr' ? 'स्मशानभूमी, रुग्णालय, कत्तलखाना यांसारख्या ठिकाणी विचारणे टाळा' : 'Avoid asking in graveyards, hospitals, slaughterhouses'}</li>
                      <li>{lang === 'mr' ? 'वारावर कोणतेही बंधन नाही; तिथी किंवा चंद्र कलेवर बंधन नाही' : 'No restriction on day of week, tithi, or lunar phase'}</li>
                    </ul>
                    <p><span className="text-purple-200 font-medium">{lang === 'mr' ? 'जातकाची प्रामाणिकता:' : 'Querist sincerity:'}</span>{' '}{lang === 'mr' ? 'प्रश्न मनापासून असेल तरच उत्तर खरे निघते. ग्रह स्वतःच खरे-खोटे दाखवतात.' : 'Only a sincere question yields a true answer. The Ruling Planets reveal authenticity automatically.'}</p>
                    <p><span className="text-purple-200 font-medium">{lang === 'mr' ? 'महत्त्वाचा नियम:' : 'One hard rule:'}</span>{' '}{lang === 'mr' ? '249 पेक्षा जास्त क्रमांक दिल्यास इच्छा पूर्ण होणार नाही असे KP म्हणतात.' : 'KP states: if the querist gives a number above 249, the matter will not materialise.'}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 text-white/30 text-[10px]">
                    {lang === 'mr' ? 'स्रोत: KP Reader VI — होरारी ज्योतिष (के.एस. कृष्णमूर्ती)' : 'Source: KP Reader VI — Horary Astrology (K.S. Krishnamurti)'}
                  </div>
                </div>
              </span>
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                min="1"
                max="249"
                value={horaryNumber}
                onChange={(e) => setHoraryNumber(e.target.value)}
                placeholder="1-249"
                className="w-32 bg-white/5 border border-purple-500/30 rounded-lg p-3 text-white text-center text-lg font-bold placeholder-white/30 focus:border-purple-400/60 focus:outline-none"
              />
              <div className="text-white/40 text-xs leading-tight">
                {lang === 'mr'
                  ? 'जातकाला 1 ते 249 मधील कोणताही क्रमांक सांगायला सांगा'
                  : 'Ask the querist to think of any number between 1 and 249'}
              </div>
            </div>
          </div>
          {/* Question Type toggle */}
          <div>
            <label className="block text-purple-300 text-sm font-medium mb-2">
              {lang === 'mr' ? 'प्रश्नाचा प्रकार' : 'Question Type'}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-purple-500/20">
              <button
                onClick={() => setKpQuestionType('yesno')}
                className={`flex-1 py-2 text-xs font-medium transition-all cursor-pointer ${
                  kpQuestionType === 'yesno'
                    ? 'bg-purple-500/20 text-purple-300 border-r border-purple-500/30'
                    : 'bg-white/5 text-white/40 border-r border-white/10 hover:bg-white/10'
                }`}
              >
                {lang === 'mr' ? 'हे होईल का?' : 'Will it happen?'}
              </button>
              <button
                onClick={() => setKpQuestionType('timing')}
                className={`flex-1 py-2 text-xs font-medium transition-all cursor-pointer ${
                  kpQuestionType === 'timing'
                    ? 'bg-indigo-500/20 text-indigo-300 border-l border-indigo-500/30'
                    : 'bg-white/5 text-white/40 border-l border-white/10 hover:bg-white/10'
                }`}
              >
                {lang === 'mr' ? 'हे कधी होईल?' : 'When will it happen?'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-purple-300 text-sm font-medium mb-2">
              {lang === 'mr' ? 'प्रश्न विषय' : 'Question Category'}
            </label>
            <select
              value={questionCategory}
              onChange={(e) => setQuestionCategory(e.target.value)}
              className="w-full bg-white/5 border border-purple-500/30 rounded-lg p-3 text-white focus:border-purple-400/60 focus:outline-none appearance-none cursor-pointer"
            >
              {QUESTION_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key} className="bg-gray-900 text-white">
                  {lang === 'mr' ? cat.mr : cat.en}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Ank Mode: Question Type + Options */}
      {mode === 'ank' && (
        <>
          <div>
            <label className="block text-gold text-sm font-medium mb-2">{t('questionType')}</label>
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
                  }`}>{i + 1}</span>
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
                        : opt.trim() ? 'bg-white/8 border-gold/30' : 'bg-white/5 border-white/10'
                    }`}
                  />
                  {questionType === 'multi' && options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-red-400/10 text-red-400/50 hover:text-red-400 hover:bg-red-400/20 flex items-center justify-center text-xs cursor-pointer transition-all"
                      title={t('removeOption')}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
            {questionType === 'multi' && options.length < 12 && (
              <button
                onClick={addOption}
                className="mt-3 w-full py-2 rounded-lg border border-dashed border-gold/20 text-gold/50 hover:text-gold hover:border-gold/40 text-sm cursor-pointer transition-all"
              >{t('addOption')}</button>
            )}
          </div>
        </>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={`w-full py-3 rounded-lg font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer pulse-glow ${
          mode === 'kp'
            ? 'bg-gradient-to-r from-purple-500/80 to-indigo-500/80 text-white hover:from-purple-500 hover:to-indigo-500'
            : 'bg-gradient-to-r from-gold/80 to-saffron/80 text-black hover:from-gold hover:to-saffron'
        }`}
      >
        {isLoading
          ? t('calculating')
          : mode === 'kp'
            ? (lang === 'mr' ? 'केपी विश्लेषण दाखवा' : 'Show KP Analysis')
            : t('showKundali')}
      </button>
    </div>
  );
}
