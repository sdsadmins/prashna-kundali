import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import KundaliChart3D from '../components/KundaliChart3D';
import RulingPlanetsTable from '../components/RulingPlanetsTable';
import CalculationBreakdown from '../components/CalculationBreakdown';
import AnswerDisplay from '../components/AnswerDisplay';
import LagnaInfo from '../components/LagnaInfo';
import LanguageToggle from '../components/LanguageToggle';

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-glass p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2" style={{ color: '#d4a017' }}>&#9788;</div>
          <h2 className="text-gold text-xl font-bold">Admin Login</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/50 text-xs mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-gold/50 focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-gold/50 focus:outline-none transition-colors"
              required
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gold/20 border border-gold/40 text-gold font-medium hover:bg-gold/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <Link
          to="/"
          className="block text-center text-white/30 text-xs mt-6 hover:text-white/50 transition-colors"
        >
          &larr; Back to Prashna Kundali
        </Link>
      </div>
    </div>
  );
}

function CalcDetail({ calc, onBack }) {
  const { lang } = useI18n();
  const timestamp = new Date(calc.timestamp).toLocaleString(
    lang === 'mr' ? 'mr-IN' : 'en-IN'
  );

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-gold/70 hover:text-gold text-sm flex items-center gap-1 cursor-pointer transition-colors"
      >
        &larr; {lang === 'mr' ? 'यादीवर परत' : 'Back to list'}
      </button>

      <div className="text-center text-xs text-white/30 mb-4">
        {lang === 'mr' ? 'गणना वेळ' : 'Calculated at'}: {timestamp}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Chart */}
        <div className="lg:w-1/2 xl:w-3/5">
          <div className="h-[500px]">
            <KundaliChart3D chartData={calc} />
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:w-1/2 xl:w-2/5 space-y-4">
          <LagnaInfo lagnaInfo={calc.lagnaInfo} timestamp={calc.timestamp} />
          <AnswerDisplay
            calculation={calc.calculation}
            options={calc.options}
            question={calc.question}
          />
          <CalculationBreakdown
            calculation={calc.calculation}
            rulingPlanets={calc.rulingPlanets}
          />
          <RulingPlanetsTable rulingPlanets={calc.rulingPlanets} />
        </div>
      </div>
    </div>
  );
}

function Dashboard({ token, onLogout }) {
  const { lang } = useI18n();
  const [calculations, setCalculations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedCalc, setSelectedCalc] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/calculations?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCalculations(data.calculations);
        setTotal(data.total);
        setPage(data.page);
        setPages(data.pages);
      } else if (res.status === 401) {
        onLogout();
      }
    } catch {
      console.error('Failed to fetch calculations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleDelete = async (id) => {
    const msg = lang === 'mr' ? 'ही गणना हटवायची?' : 'Delete this calculation?';
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`/api/admin/calculations?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCalculations((prev) => prev.filter((c) => c.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch {
      console.error('Failed to delete calculation');
    }
  };

  const handleRowClick = async (id) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/calculations?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCalc(data.calculation);
      }
    } catch {
      console.error('Failed to fetch calculation detail');
    } finally {
      setDetailLoading(false);
    }
  };

  if (selectedCalc) {
    // Merge Postgres columns: top-level fields + data JSONB column
    const merged = {
      ...selectedCalc.data,
      timestamp: selectedCalc.timestamp,
      question: selectedCalc.question,
      options: selectedCalc.options,
      location: selectedCalc.location,
    };
    return <CalcDetail calc={merged} onBack={() => setSelectedCalc(null)} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-gold text-lg font-bold">
          {lang === 'mr' ? 'गणना इतिहास' : 'Calculation History'}
          <span className="text-white/30 text-sm ml-2">({total})</span>
        </h2>
        <button
          onClick={() => fetchList(page)}
          className="text-xs text-white/40 hover:text-white/70 cursor-pointer transition-colors"
        >
          &#8635; {lang === 'mr' ? 'रिफ्रेश' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-white/30 py-12">Loading...</div>
      ) : calculations.length === 0 ? (
        <div className="text-center text-white/30 py-12">
          {lang === 'mr' ? 'अद्याप कोणतीही गणना नाही' : 'No calculations yet'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold/20 text-gold/70">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">
                    {lang === 'mr' ? 'वेळ' : 'Time'}
                  </th>
                  <th className="text-left py-2 px-3">
                    {lang === 'mr' ? 'प्रश्न' : 'Question'}
                  </th>
                  <th className="text-center py-2 px-3">
                    {lang === 'mr' ? 'पसंती' : 'Prefs'}
                  </th>
                  <th className="text-center py-2 px-3">
                    {lang === 'mr' ? 'उत्तर' : 'Answer'}
                  </th>
                  <th className="text-left py-2 px-3">
                    {lang === 'mr' ? 'लग्न' : 'Lagna'}
                  </th>
                  <th className="text-center py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((calc, i) => (
                  <tr
                    key={calc.id}
                    onClick={() => handleRowClick(calc.id)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 text-white/30">
                      {(page - 1) * 20 + i + 1}
                    </td>
                    <td className="py-3 px-3 text-white/60 text-xs whitespace-nowrap">
                      {new Date(calc.timestamp).toLocaleString(
                        lang === 'mr' ? 'mr-IN' : 'en-IN',
                        { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
                      )}
                    </td>
                    <td className="py-3 px-3 text-white max-w-[200px] truncate">
                      {calc.question || '—'}
                    </td>
                    <td className="py-3 px-3 text-center text-white/60">
                      {calc.options?.length || '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 text-gold font-bold text-sm">
                        {calc.answer_option || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white/50 text-xs">
                      {lang === 'mr'
                        ? calc.lagna_sign?.mr
                        : calc.lagna_sign?.en}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(calc.id);
                        }}
                        className="text-red-400/40 hover:text-red-400 text-xs cursor-pointer transition-colors"
                        title={lang === 'mr' ? 'हटवा' : 'Delete'}
                      >
                        &#10005;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => fetchList(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded border border-white/10 text-white/50 text-sm hover:border-gold/30 hover:text-gold disabled:opacity-30 cursor-pointer transition-colors disabled:cursor-default"
              >
                &larr;
              </button>
              <span className="text-white/40 text-sm">
                {page} / {pages}
              </span>
              <button
                onClick={() => fetchList(page + 1)}
                disabled={page >= pages}
                className="px-3 py-1.5 rounded border border-white/10 text-white/50 text-sm hover:border-gold/30 hover:text-gold disabled:opacity-30 cursor-pointer transition-colors disabled:cursor-default"
              >
                &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="text-gold">Loading...</div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
  const { lang } = useI18n();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gold/3 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/20 blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-gold/70 hover:text-gold text-sm flex items-center gap-1 transition-colors"
            >
              &larr; {lang === 'mr' ? 'प्रश्न कुंडली' : 'Prashna Kundali'}
            </Link>
            <span className="text-white/10">|</span>
            <h1 className="text-white/70 text-sm font-medium">
              {lang === 'mr' ? 'व्यवस्थापक' : 'Admin'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <button
              onClick={handleLogout}
              className="text-xs text-red-400/60 hover:text-red-400 cursor-pointer transition-colors"
            >
              {lang === 'mr' ? 'बाहेर पडा' : 'Logout'}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Dashboard token={token} onLogout={handleLogout} />
        </div>
      </div>
    </div>
  );
}
