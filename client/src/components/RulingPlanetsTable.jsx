import { useI18n } from '../i18n/useI18n';

export default function RulingPlanetsTable({ rulingPlanets }) {
  const { t, lang } = useI18n();

  if (!rulingPlanets) return null;

  return (
    <div className="card-glass p-6 animate-fade-in-up">
      <h3 className="text-gold glow-text text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">&#9795;</span>
        {t('rulingPlanetsTitle')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-gold/70">
              <th className="text-left py-2 px-3">#</th>
              <th className="text-left py-2 px-3">{t('status')}</th>
              <th className="text-left py-2 px-3">
                {lang === 'mr' ? 'स्थान' : 'Slot'}
              </th>
              <th className="text-left py-2 px-3">{t('planet')}</th>
              <th className="text-left py-2 px-3">{t('sign')}/{t('nakshatra')}</th>
              <th className="text-right py-2 px-3">{t('ank')}</th>
            </tr>
          </thead>
          <tbody>
            {rulingPlanets.map((rp, i) => (
              <tr
                key={i}
                className={`border-b border-white/5 transition-colors ${
                  rp.skipped ? 'opacity-40' : 'hover:bg-white/5'
                }`}
              >
                <td className="py-3 px-3 text-gold/50 font-bold">{rp.label || (i + 1)}</td>
                <td className="py-3 px-3">
                  {rp.skipped ? (
                    <span className="inline-flex items-center gap-1 text-red-400 text-xs bg-red-400/10 px-2 py-0.5 rounded-full">
                      <span>&#10006;</span>
                      {rp.isRetrograde ? t('retrograde') : t('skipped')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      <span>&#10004;</span>
                      {t('active')}
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-white/70">
                  {lang === 'mr' ? rp.slotMr : rp.slotEn}
                </td>
                <td className="py-3 px-3 font-medium text-white">
                  {lang === 'mr' ? rp.planetMr : rp.planetEn}
                  {rp.isRahuKetu && !rp.skipped && (
                    <span className="text-xs text-gold/50 ml-1">
                      ({lang === 'mr' ? rp.rahuKetuResolution?.sign?.mr : rp.rahuKetuResolution?.sign?.en})
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-white/50 text-xs">
                  {rp.sign && (lang === 'mr' ? rp.sign.mr : rp.sign.en)}
                  {rp.nakshatra && (lang === 'mr' ? rp.nakshatra.mr : rp.nakshatra.en)}
                  {rp.day && (lang === 'mr' ? rp.day.mr : rp.day.en)}
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={`font-mono font-bold text-lg ${
                    rp.skipped ? 'text-white/20 line-through' : 'text-gold'
                  }`}>
                    {rp.skipped ? rp.ank || '—' : rp.ank}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
