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
    if (pred.confidence === 'high') return lang === 'mr' ? 'सूर्य + चंद्र + वारनाथ संरेखन' : 'Sun + Moon + Day Lord alignment';
    if (pred.confidence === 'medium') return lang === 'mr' ? 'सूर्य + चंद्र गोचर' : 'Sun + Moon transit alignment';
    if (pred.method === 'sun-transit') return lang === 'mr' ? 'सूर्य गोचर (अंदाजे महिना)' : 'Sun transit (approximate month)';
    if (pred.method === 'dasha-period') return lang === 'mr' ? 'दशा काळ आधारित' : 'Based on Dasha period';
    return lang === 'mr' ? 'गुरू गोचर आधारित' : 'Based on Jupiter transit';
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
            <span className="text-white/30 text-xs">{lang === 'mr' ? 'केपी होरारी निर्णय' : 'KP Horary Verdict'}</span>
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
            <span className="text-white/30 text-xs">{lang === 'mr' ? 'केपी होरारी निर्णय' : 'KP Horary Verdict'}</span>
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
            <div className="text-white/50 text-sm">
              {lang === 'mr' ? 'केपी होरारी निर्णय' : 'KP Horary Verdict'}
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

      {/* Detailed Transit Dates — always visible for YES */}
      {isYes && timing && (
        <div className="card-glass p-4">
          <h3 className="text-gold text-sm font-medium mb-3">
            {lang === 'mr' ? 'घटना काल निर्धारण' : 'Event Timing'}
          </h3>
          <div className="space-y-3">
            {timing.sunTransit && (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white/50 text-xs">{lang === 'mr' ? 'सूर्य गोचर (महिना)' : 'Sun Transit (month)'}</div>
                  {timing.sunTransit.targetRange && (
                    <div className="text-white/30 text-[10px]">
                      {timing.sunTransit.targetRange.signLord}/{timing.sunTransit.targetRange.starLord}/{timing.sunTransit.targetRange.subLord}
                    </div>
                  )}
                </div>
                <div className="text-white text-sm font-medium">{formatDateShort(timing.sunTransit.date, lang)}</div>
              </div>
            )}
            {timing.moonTransit && (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white/50 text-xs">
                    {lang === 'mr' ? 'चंद्र + वारनाथ (दिवस)' : 'Moon + Day Lord (day)'}
                  </div>
                  {timing.moonTransit.dayName && (
                    <div className="text-white/30 text-[10px]">
                      {timing.moonTransit.dayName} — {timing.moonTransit.matchType || 'match'}
                    </div>
                  )}
                </div>
                <div className={`text-sm font-medium ${timing.moonTransit.confidence === 'high' ? 'text-emerald-400' : 'text-white'}`}>
                  {formatDateShort(timing.moonTransit.date, lang)}
                </div>
              </div>
            )}
            {timing.jupiterTransit && (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white/50 text-xs">{lang === 'mr' ? 'गुरू गोचर (वर्ष)' : 'Jupiter Transit (year)'}</div>
                </div>
                <div className="text-white text-sm font-medium">{formatDateShort(timing.jupiterTransit.date, lang)}</div>
              </div>
            )}
            {timing.saturnTransit && (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white/50 text-xs">{lang === 'mr' ? 'शनी गोचर' : 'Saturn Transit'}</div>
                </div>
                <div className="text-white text-sm font-medium">{formatDateShort(timing.saturnTransit.date, lang)}</div>
              </div>
            )}
            {timing.dashaTiming?.best && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white/50 text-xs">{lang === 'mr' ? 'दशा काळ (दीर्घकालीन)' : 'Dasha Period (long-term)'}</div>
                    <div className="text-white/30 text-[10px]">
                      {timing.dashaTiming.best.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-400 text-sm font-medium">{formatDateShort(timing.dashaTiming.best.date, lang)}</div>
                    {timing.dashaTiming.best.endDate && (
                      <div className="text-white/30 text-[10px]">
                        {lang === 'mr' ? 'ते' : 'to'} {formatDateShort(timing.dashaTiming.best.endDate, lang)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Prominent Dates — all predicted dates from Sun, Moon transits, and Dasha */}
          {timing.prominentDates && timing.prominentDates.length > 0 && (
            <div className="mt-3 pt-2 border-t border-white/10">
              <div className="text-white/50 text-xs mb-2">{lang === 'mr' ? 'संभाव्य तारखा' : 'Probable Dates'}</div>
              <div className="space-y-1.5">
                {timing.prominentDates.map((pd, i) => (
                  <div key={i} className="flex justify-between items-start gap-2 text-xs">
                    <div className="text-white/40 flex-1 truncate" title={pd.description}>{pd.description}</div>
                    <div className={`font-medium whitespace-nowrap ${pd.source === 'dasha' ? 'text-purple-400' : pd.confidence === 'high' ? 'text-emerald-400' : pd.confidence === 'medium' ? 'text-yellow-400' : 'text-white/70'}`}>
                      {formatDateShort(pd.date, lang)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 pt-2 border-t border-white/10 text-xs text-white/40">
            {lang === 'mr' ? 'रुलिंग ग्रह:' : 'Ruling Planets:'} {timing.fruitfulSignificators.map(p => pName(p, lang)).join(', ')}
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
