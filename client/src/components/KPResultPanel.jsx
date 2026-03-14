import { useState } from 'react';
import { useI18n } from '../i18n/useI18n';

const PLANET_NAMES = {
  en: { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' },
  mr: { sun: 'रवी', moon: 'चंद्र', mars: 'मंगळ', mercury: 'बुध', jupiter: 'गुरू', venus: 'शुक्र', saturn: 'शनी', rahu: 'राहू', ketu: 'केतू' },
};

const VERDICT_STYLES = {
  YES: { bg: 'from-emerald-500/20 to-emerald-900/10', border: 'border-emerald-500/40', text: 'text-emerald-400', label: { en: 'YES', mr: 'होय' } },
  YES_WITH_DELAY: { bg: 'from-yellow-500/20 to-yellow-900/10', border: 'border-yellow-500/40', text: 'text-yellow-400', label: { en: 'YES', mr: 'होय' } },
  NO: { bg: 'from-red-500/20 to-red-900/10', border: 'border-red-500/40', text: 'text-red-400', label: { en: 'NO', mr: 'नाही' } },
};

function pName(key, lang) {
  return PLANET_NAMES[lang]?.[key] || PLANET_NAMES.en[key] || key;
}

function formatDate(isoStr, lang) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatDateShort(isoStr, lang) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

/**
 * Get the best predicted date from timing data.
 * Uses the book's method: Sun transit = month, Moon + Day Lord = exact day.
 * bestPredictedDate is computed server-side by combining all three.
 */
function getPredictedDate(timing) {
  if (timing.bestPredictedDate) return timing.bestPredictedDate;
  // Fallback for old timing format
  if (timing.jupiterTransit) return { date: timing.jupiterTransit.date, confidence: 'low', method: 'jupiter-transit' };
  if (timing.sunTransit) return { date: timing.sunTransit.date, confidence: 'low', method: 'sun-transit' };
  if (timing.moonTransit) return { date: timing.moonTransit.date, confidence: 'low', method: 'moon-transit' };
  return null;
}

function HowItWorksTooltip({ lang }) {
  return (
    <span className="relative group cursor-help ml-2">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-purple-400/50 text-purple-300 text-[10px] leading-none select-none">?</span>
      <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-[340px] bg-[#1a1025] border border-purple-500/30 rounded-xl shadow-2xl p-4 text-xs text-white/80 leading-relaxed">
        <div className="text-purple-300 font-semibold mb-2">
          {lang === 'mr' ? 'KP होरारी कसे काम करते?' : 'How KP Horary Works'}
        </div>
        <div className="space-y-2.5">
          <div>
            <div className="text-indigo-300 font-medium mb-0.5">{lang === 'mr' ? '१. होरारी क्रमांक → लग्न' : '1. Horary Number \u2192 Lagna'}</div>
            <div className="text-white/60">{lang === 'mr'
              ? '249 उप-विभागांमधून क्रमांक शोधतो → राशी स्वामी, नक्षत्र स्वामी, उप-स्वामी मिळतात'
              : 'Lookup the number in 249 sub-table \u2192 get Sign Lord, Star Lord, Sub Lord'}</div>
          </div>
          <div>
            <div className="text-indigo-300 font-medium mb-0.5">{lang === 'mr' ? '२. ५ रुलिंग ग्रह' : '2. Five Ruling Planets'}</div>
            <div className="text-white/60">{lang === 'mr'
              ? 'वार स्वामी + चंद्र नक्षत्र स्वामी + चंद्र राशी स्वामी + लग्न नक्षत्र स्वामी + लग्न राशी स्वामी. वक्री ग्रहाच्या नक्षत्र/उप मध्ये असलेले → वगळले.'
              : "Day Lord + Moon Star Lord + Moon Sign Lord + Lagna Star Lord + Lagna Sign Lord. Planet in constellation or sub of retrograde \u2192 rejected."}</div>
          </div>
          <div>
            <div className="text-emerald-300 font-medium mb-0.5">{lang === 'mr' ? '३. होय/नाही निर्णय' : '3. YES / NO Verdict'}</div>
            <div className="text-white/60">{lang === 'mr'
              ? 'उप-स्वामी कोणत्या गृहांचा कारक आहे ते तपासतो. प्रश्न विषयाचे अनुकूल गृह बहुसंख्य → होय, नाहीतर → नाही. नक्षत्र स्वामी वक्री → विलंबासह होय.'
              : 'Check which houses the Sub Lord signifies. Favorable houses for the category dominate \u2192 YES. Otherwise \u2192 NO. Star lord retro \u2192 YES with delay.'}</div>
          </div>
          <div>
            <div className="text-yellow-300 font-medium mb-0.5">{lang === 'mr' ? '४. काल निर्धारण (होय असल्यास)' : '4. Timing (only if YES)'}</div>
            <div className="text-white/60">{lang === 'mr'
              ? 'दशा काळ → वर्ष/महिने. सूर्य गोचर → महिना. चंद्र + वारनाथ → दिवस. शूक्ष्म दशा → अचूक तारीख. सर्व स्तर जुळतात → उच्च विश्वास.'
              : 'Dasha period \u2192 year. Sun transit \u2192 month. Moon + Day Lord \u2192 day. Shookshma dasha \u2192 exact date. All layers converge \u2192 high confidence.'}</div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-white/10 text-white/30 text-[10px]">
          {lang === 'mr' ? 'स्रोत: KP Reader VI — के.एस. कृष्णमूर्ती' : 'Source: KP Reader VI \u2014 K.S. Krishnamurti'}
        </div>
      </div>
    </span>
  );
}

export default function KPResultPanel({ result }) {
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState({});

  if (!result || result.mode !== 'kp') return null;

  const { yesNo, subEntry, rulingPlanets, dashaBalance, timing, significators, planets, houses, question, kpQuestionType } = result;
  const v = VERDICT_STYLES[yesNo.verdict] || VERDICT_STYLES.NO;
  const isYes = yesNo.verdict === 'YES' || yesNo.verdict === 'YES_WITH_DELAY';
  const prediction = isYes ? getPredictedDate(timing) : null;
  const predictedDate = prediction?.date || null;
  const isTimingMode = kpQuestionType === 'timing';

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Confidence label helper
  function confidenceLabel(pred) {
    if (!pred) return '';
    const m = pred.method || '';
    if (m.includes('shookshma')) return lang === 'mr' ? 'दशा + गोचर + शूक्ष्म संरेखन' : 'Dasha + Transit + Shookshma alignment';
    if (m === 'transit-dasha-moon') return lang === 'mr' ? 'दशा + सूर्य + चंद्र + वारनाथ संरेखन' : 'Dasha + Sun + Moon + Day Lord alignment';
    if (m === 'transit-dasha') return lang === 'mr' ? 'दशा + सूर्य गोचर संरेखन' : 'Dasha + Sun transit alignment';
    if (m === 'moon-day-match') return lang === 'mr' ? 'चंद्र + वारनाथ संरेखन' : 'Moon + Day Lord alignment';
    if (pred.confidence === 'high') return lang === 'mr' ? 'सूर्य + चंद्र + वारनाथ संरेखन' : 'Sun + Moon + Day Lord alignment';
    if (pred.confidence === 'medium') return lang === 'mr' ? 'सूर्य + चंद्र गोचर' : 'Sun + Moon transit alignment';
    if (pred.method === 'dasha-period') return lang === 'mr' ? 'दशा काळ आधारित' : 'Based on Dasha period';
    return lang === 'mr' ? 'गुरू गोचर आधारित' : 'Based on Jupiter transit';
  }

  // Parse timing description to extract structured parts
  function parseTimingDesc(pred) {
    if (!pred?.description) return null;
    const desc = pred.description;
    const parts = {};
    // Extract dasha period: "in venus-jupiter-moon Dasha period" or "in venus-jupiter-moon (2/3 RP)"
    const dashaMatch = desc.match(/in\s+(\w+-\w+-\w+)\s/);
    if (dashaMatch) {
      const [maha, bhukti, anthra] = dashaMatch[1].split('-');
      parts.maha = maha;
      parts.bhukti = bhukti;
      parts.anthra = anthra;
    }
    // Extract shookshma lord: "→ jupiter shookshma"
    const shkMatch = desc.match(/→\s+(\w+)\s+shookshma/);
    if (shkMatch) parts.shookshma = shkMatch[1];
    // Extract Sun transit date
    const sunMatch = desc.match(/Sun transit\s+(\d{4}-\d{2}-\d{2})/);
    if (sunMatch) parts.sunDate = sunMatch[1];
    // Extract Moon date and day
    const moonMatch = desc.match(/Moon\s+(\d{4}-\d{2}-\d{2})\s+\((\w+)\)/);
    if (moonMatch) { parts.moonDate = moonMatch[1]; parts.moonDay = moonMatch[2]; }
    return parts;
  }

  return (
    <div className="space-y-4">
      {/* TIMING MODE: Hero is the predicted date, verdict is a small badge */}
      {isTimingMode && isYes && (
        <div className="card-glass p-5 bg-gradient-to-br from-indigo-500/20 to-indigo-900/10 border border-indigo-500/40">
          {question && (
            <p className="text-white/60 text-sm mb-3 italic">&quot;{question}&quot;</p>
          )}
          {/* Small verdict badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${v.border} ${v.text} bg-white/5`}>
              {v.label[lang] || v.label.en}
              {yesNo.verdict === 'YES_WITH_DELAY' && <span className="ml-1 opacity-70">{lang === 'mr' ? '(विलंबासह)' : '(with delay)'}</span>}
            </span>
            <span className="text-white/30 text-xs">{lang === 'mr' ? 'केपी होरारी निर्णय' : 'KP Horary Verdict'}<HowItWorksTooltip lang={lang} /></span>
          </div>
          {/* Big timing hero */}
          {predictedDate ? (
            <div className="text-center">
              <div className="text-white/50 text-xs mb-1">
                {lang === 'mr' ? 'अंदाजित तारीख' : 'Predicted Date'}
              </div>
              <div className="text-3xl font-bold text-white">
                {formatDate(predictedDate, lang)}
                {prediction?.dayName && <span className="text-xl text-white/60 ml-2">({prediction.dayName})</span>}
              </div>
              <div className="text-white/40 text-xs mt-2">{confidenceLabel(prediction)}</div>
              {prediction?.confidence === 'high' && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                    {lang === 'mr' ? 'उच्च विश्वास' : 'High confidence'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-white/40 text-sm py-2">
              {lang === 'mr' ? 'गोचर स्थिती आधारित अचूक तारीख उपलब्ध नाही' : 'Exact transit date not available — see Dasha period below'}
            </div>
          )}
          {/* Sub-lord qualitative insight */}
          {isYes && yesNo.subLordQuality && (
            <div className="mt-3 pt-3 border-t border-white/10 text-center">
              <div className="text-white/30 text-[10px] mb-0.5">{lang === 'mr' ? `उप-स्वामी ${pName(yesNo.subLord, lang)} सूचित करतो:` : `Sub-lord ${pName(yesNo.subLord, lang)} indicates:`}</div>
              <div className="text-white/60 text-xs italic">{yesNo.subLordQuality[lang] || yesNo.subLordQuality.en}</div>
            </div>
          )}
        </div>
      )}

      {/* TIMING MODE + NO verdict: show timing unavailable notice */}
      {isTimingMode && !isYes && (
        <div className="card-glass p-5 bg-gradient-to-br from-red-500/10 to-red-900/5 border border-red-500/30">
          {question && (
            <p className="text-white/60 text-sm mb-3 italic">&quot;{question}&quot;</p>
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${v.border} ${v.text} bg-white/5`}>
              {v.label[lang] || v.label.en}
            </span>
            <span className="text-white/30 text-xs">{lang === 'mr' ? 'केपी होरारी निर्णय' : 'KP Horary Verdict'}<HowItWorksTooltip lang={lang} /></span>
          </div>
          <div className="text-red-400/70 text-sm text-center">
            {lang === 'mr'
              ? 'उप-स्वामी विश्लेषणानुसार ही घटना घडणार नाही — काल निर्धारण लागू नाही'
              : 'Sub-lord analysis indicates this will not materialize — timing not applicable'}
          </div>
        </div>
      )}

      {/* YES/NO MODE (default): Verdict Card with prominent date */}
      {!isTimingMode && (
        <div className={`card-glass p-5 bg-gradient-to-br ${v.bg} border ${v.border}`}>
          {question && (
            <p className="text-white/60 text-sm mb-3 italic">&quot;{question}&quot;</p>
          )}
          <div className="text-center">
            <div className={`text-4xl font-bold ${v.text} mb-2`}>
              {v.label[lang] || v.label.en}
            </div>
            {yesNo.verdict === 'YES_WITH_DELAY' && (
              <div className="text-yellow-400/70 text-xs mb-2">
                {lang === 'mr' ? '(विलंबासह)' : '(with delay)'}
              </div>
            )}
            <div className="text-white/50 text-sm flex items-center justify-center">
              {lang === 'mr' ? 'केपी होरारी निर्णय' : 'KP Horary Verdict'}
              <HowItWorksTooltip lang={lang} />
            </div>
          </div>

          {/* Predicted Date — prominently shown for YES verdicts */}
          {isYes && predictedDate && (
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <div className="text-white/50 text-xs mb-1">
                {lang === 'mr' ? 'अंदाजित तारीख' : 'Predicted Date'}
              </div>
              <div className="text-2xl font-bold text-white">
                {formatDate(predictedDate, lang)}
                {prediction?.dayName && <span className="text-lg text-white/60 ml-2">({prediction.dayName})</span>}
              </div>
              <div className="text-white/40 text-xs mt-1">{confidenceLabel(prediction)}</div>
              {prediction?.confidence === 'high' && (
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                    {lang === 'mr' ? 'उच्च विश्वास' : 'High confidence'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Sub-lord qualitative insight */}
          {isYes && yesNo.subLordQuality && (
            <div className="mt-3 pt-3 border-t border-white/10 text-center">
              <div className="text-white/30 text-[10px] mb-0.5">{lang === 'mr' ? `उप-स्वामी ${pName(yesNo.subLord, lang)} सूचित करतो:` : `Sub-lord ${pName(yesNo.subLord, lang)} indicates:`}</div>
              <div className="text-white/60 text-xs italic">{yesNo.subLordQuality[lang] || yesNo.subLordQuality.en}</div>
            </div>
          )}

          {/* For NO verdict — show reason */}
          {!isYes && (
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <div className="text-red-400/70 text-xs">
                {lang === 'mr'
                  ? 'उप-स्वामी विश्लेषणानुसार हे घडणार नाही'
                  : 'Sub-lord analysis indicates this will not materialize'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timing Breakdown — layered convergence view */}
      {isYes && timing && (
        <div className="card-glass p-4">
          <h3 className="text-gold text-sm font-medium mb-3">
            {lang === 'mr' ? 'काल निर्धारण विश्लेषण' : 'Timing Analysis'}
          </h3>

          {/* Layered timing breakdown */}
          {prediction && (() => {
            const parts = parseTimingDesc(prediction);
            const method = prediction.method || '';
            const hasDasha = parts?.maha;
            const hasSun = parts?.sunDate;
            const hasMoon = parts?.moonDate;
            const hasShookshma = parts?.shookshma;

            // Timing layers with convergence indicator
            const layers = [];
            if (hasDasha) layers.push({ key: 'dasha', color: 'purple', icon: '◈' });
            if (hasSun) layers.push({ key: 'sun', color: 'amber', icon: '☉' });
            if (hasMoon) layers.push({ key: 'moon', color: 'blue', icon: '☽' });
            if (hasShookshma) layers.push({ key: 'shookshma', color: 'emerald', icon: '◉' });
            if (method === 'moon-day-match') layers.push({ key: 'moon-only', color: 'blue', icon: '☽' });

            return (
              <div className="space-y-2.5">
                {/* Active Dasha Period */}
                {hasDasha && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 text-xs">◈</div>
                    <div className="flex-1">
                      <div className="text-white/50 text-[10px] uppercase tracking-wider">{lang === 'mr' ? 'दशा काळ' : 'Dasha Period'}</div>
                      <div className="text-white text-sm font-medium">
                        {pName(parts.maha, lang)}-{pName(parts.bhukti, lang)}-{pName(parts.anthra, lang)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sun Transit */}
                {hasSun && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs">☉</div>
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <div className="text-white/50 text-[10px] uppercase tracking-wider">{lang === 'mr' ? 'सूर्य गोचर → महिना' : 'Sun Transit → Month'}</div>
                        {timing.sunTransit?.targetRange && (
                          <div className="text-white/30 text-[10px]">
                            {pName(timing.sunTransit.targetRange.signLord, lang)}/{pName(timing.sunTransit.targetRange.starLord, lang)}/{pName(timing.sunTransit.targetRange.subLord, lang)}
                          </div>
                        )}
                      </div>
                      <div className="text-amber-400/80 text-sm font-medium">{formatDateShort(parts.sunDate, lang)}</div>
                    </div>
                  </div>
                )}

                {/* Moon + Day Lord */}
                {(hasMoon || method === 'moon-day-match') && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 text-xs">☽</div>
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <div className="text-white/50 text-[10px] uppercase tracking-wider">{lang === 'mr' ? 'चंद्र + वारनाथ → दिवस' : 'Moon + Day Lord → Day'}</div>
                        {(parts?.moonDay || prediction.dayName) && (
                          <div className="text-white/30 text-[10px]">{parts?.moonDay || prediction.dayName}</div>
                        )}
                      </div>
                      <div className="text-blue-400/80 text-sm font-medium">
                        {formatDateShort(hasMoon ? parts.moonDate : prediction.date, lang)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Shookshma */}
                {hasShookshma && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-[10px]">◉</div>
                    <div className="flex-1">
                      <div className="text-white/50 text-[10px] uppercase tracking-wider">{lang === 'mr' ? 'शूक्ष्म दशा → अचूक दिवस' : 'Shookshma Dasha → Exact Day'}</div>
                      <div className="text-emerald-400/80 text-sm font-medium">
                        {pName(parts.shookshma, lang)} {lang === 'mr' ? 'शूक्ष्म' : 'Shookshma'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Convergence summary bar */}
                <div className="mt-1 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/30 text-[10px]">{lang === 'mr' ? 'संरेखन:' : 'Alignment:'}</span>
                    {layers.map((l, i) => {
                      const dotColors = { purple: 'bg-purple-400', amber: 'bg-amber-400', blue: 'bg-blue-400', emerald: 'bg-emerald-400' };
                      return <span key={i} className={`inline-block w-2 h-2 rounded-full ${dotColors[l.color] || 'bg-white/40'}`} title={l.key} />;
                    })}
                    <span className="text-white/30 text-[10px] ml-1">
                      {layers.length >= 4
                        ? (lang === 'mr' ? '४-स्तरीय (उत्कृष्ट)' : '4-layer (excellent)')
                        : layers.length >= 3
                          ? (lang === 'mr' ? '३-स्तरीय (उच्च)' : '3-layer (high)')
                          : layers.length >= 2
                            ? (lang === 'mr' ? '२-स्तरीय (चांगले)' : '2-layer (good)')
                            : (lang === 'mr' ? '१-स्तरीय' : '1-layer')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Additional transits — collapsible */}
          <div className="mt-3 pt-2 border-t border-white/10">
            <button onClick={() => toggle('transits')} className="w-full flex justify-between items-center cursor-pointer">
              <span className="text-white/50 text-xs">{lang === 'mr' ? 'अतिरिक्त गोचर' : 'Additional Transits'}</span>
              <span className="text-white/30 text-[10px]">{expanded.transits ? '▾' : '▸'}</span>
            </button>
            {expanded.transits && (
              <div className="mt-2 space-y-2">
                {timing.jupiterTransit && (
                  <div className="flex justify-between items-center">
                    <div className="text-white/40 text-xs">{lang === 'mr' ? 'गुरू गोचर (वर्ष)' : 'Jupiter Transit (year)'}</div>
                    <div className="text-white/70 text-xs font-medium">{formatDateShort(timing.jupiterTransit.date, lang)}</div>
                  </div>
                )}
                {timing.saturnTransit && (
                  <div className="flex justify-between items-center">
                    <div className="text-white/40 text-xs">{lang === 'mr' ? 'शनी गोचर' : 'Saturn Transit'}</div>
                    <div className="text-white/70 text-xs font-medium">{formatDateShort(timing.saturnTransit.date, lang)}</div>
                  </div>
                )}
                {timing.dashaTiming?.best && (
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white/40 text-xs">{lang === 'mr' ? 'सर्वोत्तम दशा काळ' : 'Best Dasha Period'}</div>
                      <div className="text-white/30 text-[10px]">{timing.dashaTiming.best.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-400/70 text-xs font-medium">{formatDateShort(timing.dashaTiming.best.date, lang)}</div>
                      {timing.dashaTiming.best.endDate && (
                        <div className="text-white/30 text-[10px]">{lang === 'mr' ? 'ते' : 'to'} {formatDateShort(timing.dashaTiming.best.endDate, lang)}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prominent Dates — collapsible */}
          {timing.prominentDates && timing.prominentDates.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <button onClick={() => toggle('prominent')} className="w-full flex justify-between items-center cursor-pointer">
                <span className="text-white/50 text-xs">{lang === 'mr' ? 'संभाव्य तारखा' : 'Probable Dates'} ({timing.prominentDates.length})</span>
                <span className="text-white/30 text-[10px]">{expanded.prominent ? '▾' : '▸'}</span>
              </button>
              {expanded.prominent && (
                <div className="mt-2 space-y-1.5">
                  {timing.prominentDates.map((pd, i) => (
                    <div key={i} className="flex justify-between items-start gap-2 text-xs">
                      <div className="text-white/40 flex-1 truncate" title={pd.description}>{pd.description}</div>
                      <div className={`font-medium whitespace-nowrap ${pd.source === 'dasha' ? 'text-purple-400' : pd.confidence === 'high' ? 'text-emerald-400' : pd.confidence === 'medium' ? 'text-yellow-400' : 'text-white/70'}`}>
                        {formatDateShort(pd.date, lang)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fruitful Significators footer */}
          <div className="mt-3 pt-2 border-t border-white/10 text-xs text-white/40">
            {lang === 'mr' ? 'फलदायी कारक:' : 'Fruitful Significators:'} {timing.fruitfulSignificators.map(p => pName(p, lang)).join(', ')}
            {timing.targetPositionCount !== undefined && (
              <span className="ml-2">({timing.targetPositionCount} {lang === 'mr' ? 'लक्ष्य स्थाने' : 'target positions'})</span>
            )}
          </div>
        </div>
      )}

      {/* Sub Entry Info */}
      <div className="card-glass p-4">
        <h3 className="text-gold text-sm font-medium mb-3">
          {lang === 'mr' ? `होरारी क्रमांक #${subEntry.number}` : `Horary Number #${subEntry.number}`}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-white/40">{lang === 'mr' ? 'राशी' : 'Sign'}</div>
          <div className="text-white">{subEntry.sign} ({pName(subEntry.signLord, lang)})</div>
          <div className="text-white/40">{lang === 'mr' ? 'नक्षत्र' : 'Star'}</div>
          <div className="text-white">{subEntry.nakshatra} ({pName(subEntry.starLord, lang)})</div>
          <div className="text-white/40">{lang === 'mr' ? 'उप-स्वामी' : 'Sub Lord'}</div>
          <div className="text-white">{pName(subEntry.subLord, lang)}</div>
          <div className="text-white/40">{lang === 'mr' ? 'अंश' : 'Degree'}</div>
          <div className="text-white">{subEntry.startDMS} - {subEntry.endDMS}</div>
        </div>
      </div>

      {/* Dasha Balance */}
      <div className="card-glass p-4">
        <h3 className="text-gold text-sm font-medium mb-3">
          {lang === 'mr' ? 'विंशोत्तरी दशा शिल्लक' : 'Vimshottari Dasha Balance'}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-white/40">{lang === 'mr' ? 'महा दशा' : 'Maha Dasha'}</div>
          <div className="text-white">{pName(dashaBalance.mahaDasha.lord, lang)}</div>
          <div className="text-white/40">{lang === 'mr' ? 'शिल्लक' : 'Remaining'}</div>
          <div className="text-white">
            {Math.floor(dashaBalance.mahaDasha.remainingYears)}y {Math.floor((dashaBalance.mahaDasha.remainingDays % 365.25) / 30.44)}m {Math.floor(dashaBalance.mahaDasha.remainingDays % 30.44)}d
          </div>
          {dashaBalance.currentBhukti && (
            <>
              <div className="text-white/40">{lang === 'mr' ? 'भुक्ती' : 'Bhukti'}</div>
              <div className="text-white">{pName(dashaBalance.currentBhukti.lord, lang)}</div>
            </>
          )}
          {dashaBalance.currentAnthra && (
            <>
              <div className="text-white/40">{lang === 'mr' ? 'अंतरा' : 'Anthra'}</div>
              <div className="text-white">{pName(dashaBalance.currentAnthra.lord, lang)}</div>
            </>
          )}
        </div>
      </div>

      {/* Decision Reasoning (collapsible) */}
      <div className="card-glass p-4">
        <button onClick={() => toggle('reasoning')} className="w-full flex justify-between items-center cursor-pointer">
          <h3 className="text-gold text-sm font-medium">
            {lang === 'mr' ? 'निर्णय तर्क' : 'Decision Reasoning'}
          </h3>
          <span className="text-white/30">{expanded.reasoning ? '▾' : '▸'}</span>
        </button>
        {expanded.reasoning && (
          <div className="mt-3 space-y-1">
            {yesNo.reasoning.map((r, i) => (
              <div key={i} className={`text-xs ${r.startsWith('VERDICT') ? v.text + ' font-bold' : r.startsWith('WARNING') ? 'text-yellow-400/80' : 'text-white/60'}`}>
                {r}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ruling Planets */}
      <div className="card-glass p-4">
        <h3 className="text-gold text-sm font-medium mb-3">
          {lang === 'mr' ? 'रुलिंग प्लॅनेट्स (5 घटक)' : 'Ruling Planets (5 Components)'}
        </h3>
        <div className="space-y-2">
          {Object.entries(rulingPlanets.components).map(([key, comp]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-white/50">{comp.source}</span>
              <span className={`font-medium ${rulingPlanets.rejected.some(r => r.planet === comp.planet) ? 'text-red-400/60 line-through' : 'text-white'}`}>
                {pName(comp.planet, lang)}
              </span>
            </div>
          ))}
        </div>
        {rulingPlanets.rejected.length > 0 && (
          <div className="mt-2 text-xs text-red-400/60">
            {lang === 'mr' ? 'वगळले:' : 'Rejected:'} {rulingPlanets.rejected.map(r => `${pName(r.planet, lang)} (${r.reason})`).join(', ')}
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-emerald-400/70">
          {lang === 'mr' ? 'सक्रिय:' : 'Active:'} {rulingPlanets.filtered.map(p => pName(p, lang)).join(', ')}
        </div>
      </div>

      {/* Significators (collapsible) */}
      <div className="card-glass p-4">
        <button onClick={() => toggle('sig')} className="w-full flex justify-between items-center cursor-pointer">
          <h3 className="text-gold text-sm font-medium">
            {lang === 'mr' ? 'गृह महत्वाचे (A/B/C/D)' : 'House Significators (A/B/C/D)'}
          </h3>
          <span className="text-white/30">{expanded.sig ? '▾' : '▸'}</span>
        </button>
        {expanded.sig && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left py-1 pr-2">{lang === 'mr' ? 'गृह' : 'House'}</th>
                  <th className="text-left py-1 pr-2">A</th>
                  <th className="text-left py-1 pr-2">B</th>
                  <th className="text-left py-1 pr-2">C</th>
                  <th className="text-left py-1">D</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(significators).map(([h, levels]) => (
                  <tr key={h} className="border-b border-white/5">
                    <td className="py-1 pr-2 text-gold/70 font-medium">{h}</td>
                    <td className="py-1 pr-2 text-white/70">{levels.A.map(p => pName(p, lang)).join(', ') || '-'}</td>
                    <td className="py-1 pr-2 text-white/70">{levels.B.map(p => pName(p, lang)).join(', ') || '-'}</td>
                    <td className="py-1 pr-2 text-white/70">{levels.C.map(p => pName(p, lang)).join(', ') || '-'}</td>
                    <td className="py-1 text-white/70">{levels.D.map(p => pName(p, lang)).join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Planet Positions (collapsible) */}
      <div className="card-glass p-4">
        <button onClick={() => toggle('planets')} className="w-full flex justify-between items-center cursor-pointer">
          <h3 className="text-gold text-sm font-medium">
            {lang === 'mr' ? 'ग्रह स्थिती' : 'Planet Positions'}
          </h3>
          <span className="text-white/30">{expanded.planets ? '▾' : '▸'}</span>
        </button>
        {expanded.planets && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left py-1">{lang === 'mr' ? 'ग्रह' : 'Planet'}</th>
                  <th className="text-left py-1">{lang === 'mr' ? 'राशी' : 'Sign'}</th>
                  <th className="text-left py-1">{lang === 'mr' ? 'नक्षत्र' : 'Nakshatra'}</th>
                  <th className="text-left py-1">{lang === 'mr' ? 'उप' : 'Sub'}</th>
                  <th className="text-left py-1">{lang === 'mr' ? 'अंश' : 'Deg'}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(planets).map(([key, p]) => (
                  <tr key={key} className="border-b border-white/5">
                    <td className="py-1 text-white font-medium">
                      {pName(key, lang)} {p.isRetrograde ? <span className="text-red-400 text-[10px]">R</span> : ''}
                    </td>
                    <td className="py-1 text-white/70">{p.sign}</td>
                    <td className="py-1 text-white/70">{p.nakshatra}</td>
                    <td className="py-1 text-white/70">{pName(p.subLord, lang)}</td>
                    <td className="py-1 text-white/50">{p.degreeInSign}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
