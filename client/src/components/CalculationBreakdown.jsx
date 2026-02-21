import { useI18n } from '../i18n/useI18n';

export default function CalculationBreakdown({ calculation, rulingPlanets }) {
  const { t, lang } = useI18n();

  if (!calculation) return null;

  const activePlanets = rulingPlanets.filter((rp) => !rp.skipped);
  const ankValues = activePlanets.map((rp) => rp.ank);
  const sumStr = ankValues.join(' + ');

  return (
    <div className="card-glass p-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <h3 className="text-gold glow-text text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">&#9883;</span>
        {t('calculationTitle')}
      </h3>

      <div className="space-y-4">
        {/* Step 1: Individual Anks */}
        <div className="space-y-2">
          {rulingPlanets.map((rp, i) => (
            <div
              key={i}
              className="flex items-center gap-3 text-sm animate-fade-in-up"
              style={{ animationDelay: `${0.1 * (i + 1)}s` }}
            >
              <span className="text-gold/40 w-6">{i + 1}.</span>
              <span className="text-white/70">
                {lang === 'mr' ? rp.slotMr : rp.slotEn}:
              </span>
              <span className="font-medium text-white">
                {lang === 'mr' ? rp.planetMr : rp.planetEn}
              </span>
              <span className="text-white/30">→</span>
              {rp.skipped ? (
                <span className="text-red-400/70 text-xs">
                  {t('skipped')} ({rp.skipReason})
                </span>
              ) : (
                <span className="text-gold font-mono font-bold">{t('ank')} = {rp.ank}</span>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gold/20 pt-4">
          {/* Step 2: Sum */}
          <div className="flex items-center gap-3 text-base animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <span className="text-gold font-medium">{t('total')}:</span>
            <span className="font-mono text-white">
              {sumStr} = <span className="text-gold font-bold text-xl">{calculation.totalAnk}</span>
            </span>
          </div>

          {/* Step 3: Division */}
          <div className="mt-3 flex items-center gap-3 text-base animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <span className="text-gold font-medium">{t('division')}:</span>
            <span className="font-mono text-white">
              {calculation.totalAnk} ÷ {calculation.optionsCount} = {calculation.division.quotient}
            </span>
          </div>

          {/* Step 4: Remainder */}
          <div className="mt-3 flex items-center gap-3 text-base animate-fade-in-up" style={{ animationDelay: '1.0s' }}>
            <span className="text-gold font-medium">{t('remainder')}:</span>
            <span className="font-mono text-2xl font-bold text-saffron">
              {calculation.division.remainder}
            </span>
            {calculation.division.remainder === 0 && (
              <span className="text-xs text-white/50">
                → {t('lastOption')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
