import { useState, useEffect, useCallback } from 'react';
import { I18nProvider, useI18n } from './i18n/useI18n';
import SplashScreen from './components/SplashScreen';
import LanguageToggle from './components/LanguageToggle';
import QuestionForm from './components/QuestionForm';
import KundaliChart3D from './components/KundaliChart3D';
import RulingPlanetsTable from './components/RulingPlanetsTable';
import CalculationBreakdown from './components/CalculationBreakdown';
import AnswerDisplay from './components/AnswerDisplay';
import LagnaInfo from './components/LagnaInfo';
import LiveLagnaBar from './components/LiveLagnaBar';
import VerificationPanel from './components/VerificationPanel';
import { getCurrentPosition } from './utils/geolocation';
import './index.css';

function AppContent() {
  const { t, lang } = useI18n();
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Get geolocation on mount
  useEffect(() => {
    getCurrentPosition()
      .then(setLocation)
      .catch(() => {
        setLocationError(true);
        // Fallback to Pune
        setLocation({ latitude: 18.5204, longitude: 73.8567 });
      });
  }, []);

  const handleCalculate = async ({ question, options, optionsCount }) => {
    if (!location) return;
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          optionsCount,
          question,
          options,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        console.error('API error:', data.error);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const timestamp = result?.timestamp
    ? new Date(result.timestamp).toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN')
    : null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gold/3 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/20 blur-[150px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-saffron/5 blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-3xl font-bold text-gold glow-text tracking-wide">
              ॥ {t('appTitle')} ॥
            </h1>
            <p className="text-white/40 text-sm mt-1">{t('appSubtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            {location && (
              <span className="text-xs text-emerald-400/60 flex items-center gap-1">
                <span>&#9679;</span>
                {locationError
                  ? lang === 'mr' ? 'पुणे (डीफॉल्ट)' : 'Pune (default)'
                  : t('locationDetected')}
              </span>
            )}
            <LanguageToggle />
          </div>
        </header>

        {/* Before results: centered form */}
        {!result && (
          <div className="max-w-xl mx-auto px-4 py-8">
            {/* Live Lagna indicator */}
            {location && (
              <div className="mb-6">
                <LiveLagnaBar location={location} />
              </div>
            )}

            <QuestionForm onCalculate={handleCalculate} isLoading={isLoading} />

            {/* Empty state hint */}
            {!isLoading && (
              <div className="mt-8 text-center">
                <div className="text-6xl mb-4 opacity-10">&#9788;</div>
                <p className="text-white/15 text-sm">
                  {lang === 'mr'
                    ? 'प्रश्न विचारा आणि "कुंडली दाखवा" वर क्लिक करा'
                    : 'Ask a question and click "Show Kundali"'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* After results: full-width two-column layout */}
        {result && (
          <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
            {/* Left panel: Chart (full height) */}
            <div className="lg:w-1/2 xl:w-3/5 h-full flex flex-col">
              {/* Timestamp bar */}
              <div className="text-center text-xs text-white/30 py-2">
                {lang === 'mr' ? 'गणना वेळ' : 'Calculated at'}: {timestamp}
              </div>
              {/* Chart fills remaining space */}
              <div className="flex-1 px-2 pb-2">
                <KundaliChart3D chartData={result} />
              </div>
            </div>

            {/* Right panel: scrollable details */}
            <div className="lg:w-1/2 xl:w-2/5 h-full overflow-y-auto px-4 py-2 space-y-4">
              {/* Lagna Info (degree, sign, time until change) */}
              <LagnaInfo
                lagnaInfo={result.lagnaInfo}
                timestamp={result.timestamp}
              />

              {/* Answer (first, most important) */}
              <AnswerDisplay
                calculation={result.calculation}
                options={result.options}
                question={result.question}
              />

              {/* Calculation Breakdown */}
              <CalculationBreakdown
                calculation={result.calculation}
                rulingPlanets={result.rulingPlanets}
              />

              {/* Ruling Planets Table */}
              <RulingPlanetsTable rulingPlanets={result.rulingPlanets} />

              {/* Verification: Our values vs ProKerala */}
              <VerificationPanel
                chartData={result.chart}
                timestamp={result.timestamp}
                location={location}
              />

              {/* New Calculation button */}
              <button
                onClick={() => setResult(null)}
                className="w-full py-3 rounded-lg border border-gold/30 text-gold/70 hover:text-gold hover:border-gold/50 transition-all cursor-pointer text-sm"
              >
                {lang === 'mr' ? '← नवीन प्रश्न विचारा' : '← Ask New Question'}
              </button>

              {/* Footer */}
              <div className="text-center text-white/10 text-xs pb-4">
                {lang === 'mr'
                  ? 'केपी रुलिंग प्लॅनेट्स + अंक शास्त्र पद्धती'
                  : 'KP Ruling Planets + Ank Shastra Method'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <I18nProvider>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <AppContent />
    </I18nProvider>
  );
}
