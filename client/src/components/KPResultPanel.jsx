import { useState } from 'react';
import { useI18n } from '../i18n/useI18n';

const PLANET_NAMES = {
  en: { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' },
  mr: { sun: 'रवी', moon: 'चंद्र', mars: 'मंगळ', mercury: 'बुध', jupiter: 'गुरू', venus: 'शुक्र', saturn: 'शनी', rahu: 'राहू', ketu: 'केतू' },
};

const VERDICT_STYLES = {
  YES: { bg: 'from-emerald-500/20 to-emerald-900/10', border: 'border-emerald-500/40', text: 'text-emerald-400', label: { en: 'YES', mr: 'होय' } },
  YES_WITH_DELAY: { bg: 'from-yellow-500/20 to-yellow-900/10', border: 'border-yellow-500/40', text: 'text-yellow-400', label: { en: 'YES (Delayed)', mr: 'होय (विलंबित)' } },
  NO: { bg: 'from-red-500/20 to-red-900/10', border: 'border-red-500/40', text: 'text-red-400', label: { en: 'NO', mr: 'नाही' } },
  MIXED_POSITIVE: { bg: 'from-amber-500/20 to-amber-900/10', border: 'border-amber-500/40', text: 'text-amber-400', label: { en: 'Likely YES', mr: 'बहुधा होय' } },
  MIXED_NEGATIVE: { bg: 'from-orange-500/20 to-orange-900/10', border: 'border-orange-500/40', text: 'text-orange-400', label: { en: 'Likely NO', mr: 'बहुधा नाही' } },
  UNCERTAIN: { bg: 'from-gray-500/20 to-gray-900/10', border: 'border-gray-500/40', text: 'text-gray-400', label: { en: 'Uncertain', mr: 'अनिश्चित' } },
  UNKNOWN: { bg: 'from-gray-500/20 to-gray-900/10', border: 'border-gray-500/40', text: 'text-gray-400', label: { en: 'Unknown', mr: 'अज्ञात' } },
};

function pName(key, lang) {
  return PLANET_NAMES[lang]?.[key] || PLANET_NAMES.en[key] || key;
}

export default function KPResultPanel({ result }) {
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState({});

  if (!result || result.mode !== 'kp') return null;

  const { yesNo, subEntry, rulingPlanets, dashaBalance, timing, significators, planets, houses, question } = result;
  const v = VERDICT_STYLES[yesNo.verdict] || VERDICT_STYLES.UNKNOWN;

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      {/* Verdict Card */}
      <div className={`card-glass p-5 bg-gradient-to-br ${v.bg} border ${v.border}`}>
        {question && (
          <p className="text-white/60 text-sm mb-3 italic">"{question}"</p>
        )}
        <div className="text-center">
          <div className={`text-4xl font-bold ${v.text} mb-2`}>
            {v.label[lang] || v.label.en}
          </div>
          <div className="text-white/50 text-sm">
            {lang === 'mr' ? 'केपी होरारी निर्णय' : 'KP Horary Verdict'}
          </div>
        </div>
      </div>

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

      {/* Yes/No Reasoning */}
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

      {/* Event Timing */}
      <div className="card-glass p-4">
        <h3 className="text-gold text-sm font-medium mb-3">
          {lang === 'mr' ? 'घटना काल निर्धारण' : 'Event Timing'}
        </h3>
        <div className="text-xs text-white/50 mb-2">
          {lang === 'mr' ? 'फलदायी महत्वाचे:' : 'Fruitful Significators:'} {timing.fruitfulSignificators.map(p => pName(p, lang)).join(', ')}
        </div>
        <div className="space-y-2 text-sm">
          {timing.moonTransit && (
            <div className="flex justify-between">
              <span className="text-white/40">{lang === 'mr' ? 'चंद्र गोचर' : 'Moon Transit'}</span>
              <span className="text-white">{new Date(timing.moonTransit.date).toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN')}</span>
            </div>
          )}
          {timing.sunTransit && (
            <div className="flex justify-between">
              <span className="text-white/40">{lang === 'mr' ? 'सूर्य गोचर' : 'Sun Transit'}</span>
              <span className="text-white">{new Date(timing.sunTransit.date).toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN')}</span>
            </div>
          )}
          {timing.jupiterTransit && (
            <div className="flex justify-between">
              <span className="text-white/40">{lang === 'mr' ? 'गुरू गोचर' : 'Jupiter Transit'}</span>
              <span className="text-white">{new Date(timing.jupiterTransit.date).toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN')}</span>
            </div>
          )}
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
