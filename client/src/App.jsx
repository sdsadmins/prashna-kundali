import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n/useI18n';
import SplashScreen from './components/SplashScreen';
import LanguageToggle from './components/LanguageToggle';
import QuestionForm from './components/QuestionForm';
import KundaliChart3D from './components/KundaliChart3D';
import RulingPlanetsTable from './components/RulingPlanetsTable';
import CalculationBreakdown from './components/CalculationBreakdown';
import AnswerDisplay from './components/AnswerDisplay';
import KPResultPanel from './components/KPResultPanel';
import KPReferencePanel from './components/KPReferencePanel';
import LagnaInfo from './components/LagnaInfo';
import LiveLagnaBar from './components/LiveLagnaBar';
import VerificationPanel from './components/VerificationPanel';
import AdminPage from './pages/AdminPage';
import { getCurrentPosition, getLocationName } from './utils/geolocation';
import './index.css';

function AppContent() {
  const { t, lang } = useI18n();
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formMode, setFormMode] = useState('ank');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [citySearching, setCitySearching] = useState(false);

  // Get geolocation on mount
  useEffect(() => {
    getCurrentPosition()
      .then((loc) => {
        setLocation(loc);
        setLocationError(false);
        getLocationName(loc.latitude, loc.longitude).then(setLocationName);
      })
      .catch(() => {
        setLocationError(true);
        // No default fallback — user must provide location
      });
  }, []);

  const retryGeolocation = () => {
    getCurrentPosition()
      .then((loc) => {
        setLocation(loc);
        setLocationError(false);
        setShowLocationInput(false);
        getLocationName(loc.latitude, loc.longitude).then(setLocationName);
      })
      .catch(() => {
        setLocationError(true);
      });
  };

  const searchCity = async () => {
    if (!citySearch.trim()) return;
    setCitySearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(citySearch.trim())}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const loc = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
        setLocation(loc);
        setLocationError(false);
        setShowLocationInput(false);
        setCitySearch('');
        setLocationName(data[0].display_name.split(',')[0]);
      }
    } catch { /* ignore */ }
    finally { setCitySearching(false); }
  };

  const handleCalculate = async ({ question, options, optionsCount, mode, horaryNumber, questionCategory, kpQuestionType }) => {
    if (!location) {
      setShowLocationInput(true);
      return;
    }
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
          mode,
          horaryNumber,
          questionCategory,
          kpQuestionType,
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

      {/* Version footer */}
      <div className="fixed bottom-0 left-0 right-0 text-center text-white/30 text-xs py-1 z-50 pointer-events-none">
        v{__BUILD_ID__}
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
            {result && (
              <button
                onClick={() => setResult(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gold/30 text-gold/70 hover:text-gold hover:border-gold/50 transition-all cursor-pointer"
              >
                {lang === 'mr' ? '← नवीन प्रश्न' : '← New Question'}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowLocationInput(!showLocationInput)}
                className={`text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                  !location ? 'text-red-400 hover:text-red-300 animate-pulse' :
                  locationError ? 'text-amber-400/70 hover:text-amber-400' : 'text-emerald-400/60 hover:text-emerald-400'
                }`}
                title={location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : ''}
              >
                <span>&#9679;</span>
                {!location
                  ? lang === 'mr' ? 'स्थान सेट करा' : 'Set location'
                  : locationName || t('locationDetected')}
                <span className="text-white/20 ml-0.5">&#9998;</span>
              </button>
              {showLocationInput && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-black/90 border border-white/10 rounded-lg p-3 shadow-xl z-50">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCity()}
                      placeholder={lang === 'mr' ? 'शहर शोधा...' : 'Search city...'}
                      className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:border-gold/50 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={searchCity}
                      disabled={citySearching}
                      className="px-2 py-1.5 bg-gold/20 border border-gold/30 rounded text-gold text-xs cursor-pointer hover:bg-gold/30 disabled:opacity-50"
                    >
                      {citySearching ? '...' : '&#8594;'}
                    </button>
                  </div>
                  <button
                    onClick={retryGeolocation}
                    className="w-full text-xs text-emerald-400/60 hover:text-emerald-400 cursor-pointer py-1 transition-colors"
                  >
                    &#8853; {lang === 'mr' ? 'स्वयं शोध पुन्हा करा' : 'Retry auto-detect'}
                  </button>
                  {location && (
                    <div className="text-white/20 text-[10px] text-center mt-1">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </div>
                  )}
                  {locationError && (
                    <div className="text-red-400/80 text-[10px] mt-2 leading-tight">
                      {lang === 'mr'
                        ? 'अचूक गणनेसाठी तुमचे स्थान आवश्यक आहे. कृपया शहर शोधा.'
                        : 'Your location is required for accurate calculation. Please search your city.'}
                    </div>
                  )}
                </div>
              )}
            </div>
            <LanguageToggle />
            <Link
              to="/admin"
              className="text-white/30 hover:text-gold/70 text-xs transition-colors"
            >
              {localStorage.getItem('admin_token')
                ? (lang === 'mr' ? 'व्यवस्थापक' : 'Admin')
                : (lang === 'mr' ? 'लॉगिन' : 'Login')}
            </Link>
          </div>
        </header>

        {/* Location warning banner */}
        {!location && (
          <div
            onClick={() => setShowLocationInput(true)}
            className="mx-4 mb-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center cursor-pointer hover:bg-red-500/15 transition-colors animate-pulse"
          >
            {lang === 'mr'
              ? 'अचूक गणनेसाठी तुमचे स्थान आवश्यक आहे. कृपया वरील बटणावर क्लिक करून शहर टाका.'
              : 'Your location is required for accurate calculation. Click here or the location button above to set your city.'}
          </div>
        )}

        {/* Before results: centered form */}
        {!result && (
          <div className="max-w-xl mx-auto px-4 py-8">
            {/* Live Lagna indicator */}
            {location && (
              <div className="mb-6">
                <LiveLagnaBar location={location} />
              </div>
            )}

            <QuestionForm onCalculate={handleCalculate} isLoading={isLoading} initialMode={formMode} onModeChange={setFormMode} />

            {/* KP Reference Tables (only in KP mode) */}
            {formMode === 'kp' && !isLoading && (
              <div className="mt-4">
                <KPReferencePanel />
              </div>
            )}

            {/* Empty state hint */}
            {!isLoading && formMode !== 'kp' && (
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
              {result.mode === 'kp' ? (
                <>
                  <KPResultPanel result={result} />

                  <KPReferencePanel />

                  <button
                    onClick={() => setResult(null)}
                    className="w-full py-3 rounded-lg border border-purple-500/30 text-purple-300/70 hover:text-purple-300 hover:border-purple-500/50 transition-all cursor-pointer text-sm"
                  >
                    {lang === 'mr' ? '← नवीन प्रश्न विचारा' : '← Ask New Question'}
                  </button>

                  <div className="text-center text-white/10 text-xs pb-4">
                    {lang === 'mr'
                      ? 'केपी होरारी ज्योतिष पद्धती (KP Reader VI)'
                      : 'KP Horary Astrology Method (KP Reader VI)'}
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrashnaPage() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <AppContent />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <Routes>
          <Route path="/" element={<PrashnaPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </I18nProvider>
    </BrowserRouter>
  );
}
