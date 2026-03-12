import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';

const PLANET_NAMES = {
  sun: { en: 'Sun', mr: 'रवी' },
  moon: { en: 'Moon', mr: 'चंद्र' },
  mars: { en: 'Mars', mr: 'मंगळ' },
  mercury: { en: 'Mercury', mr: 'बुध' },
  jupiter: { en: 'Jupiter', mr: 'गुरू' },
  venus: { en: 'Venus', mr: 'शुक्र' },
  saturn: { en: 'Saturn', mr: 'शनी' },
  rahu: { en: 'Rahu', mr: 'राहू' },
  ketu: { en: 'Ketu', mr: 'केतू' },
};

const RASHI_LORDS = [
  { en: 'Aries', mr: 'मेष', lord: 'mars' },
  { en: 'Taurus', mr: 'वृषभ', lord: 'venus' },
  { en: 'Gemini', mr: 'मिथुन', lord: 'mercury' },
  { en: 'Cancer', mr: 'कर्क', lord: 'moon' },
  { en: 'Leo', mr: 'सिंह', lord: 'sun' },
  { en: 'Virgo', mr: 'कन्या', lord: 'mercury' },
  { en: 'Libra', mr: 'तूळ', lord: 'venus' },
  { en: 'Scorpio', mr: 'वृश्चिक', lord: 'mars' },
  { en: 'Sagittarius', mr: 'धनु', lord: 'jupiter' },
  { en: 'Capricorn', mr: 'मकर', lord: 'saturn' },
  { en: 'Aquarius', mr: 'कुंभ', lord: 'saturn' },
  { en: 'Pisces', mr: 'मीन', lord: 'jupiter' },
];

const NAKSHATRA_LORDS = [
  { en: 'Ashwini', mr: 'अश्विनी', lord: 'ketu' },
  { en: 'Bharani', mr: 'भरणी', lord: 'venus' },
  { en: 'Krittika', mr: 'कृत्तिका', lord: 'sun' },
  { en: 'Rohini', mr: 'रोहिणी', lord: 'moon' },
  { en: 'Mrigashira', mr: 'मृगशीर्ष', lord: 'mars' },
  { en: 'Ardra', mr: 'आर्द्रा', lord: 'rahu' },
  { en: 'Punarvasu', mr: 'पुनर्वसू', lord: 'jupiter' },
  { en: 'Pushya', mr: 'पुष्य', lord: 'saturn' },
  { en: 'Ashlesha', mr: 'आश्लेषा', lord: 'mercury' },
  { en: 'Magha', mr: 'मघा', lord: 'ketu' },
  { en: 'Purva Phalguni', mr: 'पूर्वा फाल्गुनी', lord: 'venus' },
  { en: 'Uttara Phalguni', mr: 'उत्तरा फाल्गुनी', lord: 'sun' },
  { en: 'Hasta', mr: 'हस्त', lord: 'moon' },
  { en: 'Chitra', mr: 'चित्रा', lord: 'mars' },
  { en: 'Swati', mr: 'स्वाती', lord: 'rahu' },
  { en: 'Vishakha', mr: 'विशाखा', lord: 'jupiter' },
  { en: 'Anuradha', mr: 'अनुराधा', lord: 'saturn' },
  { en: 'Jyeshtha', mr: 'ज्येष्ठा', lord: 'mercury' },
  { en: 'Moola', mr: 'मूळ', lord: 'ketu' },
  { en: 'Purva Ashadha', mr: 'पूर्वाषाढा', lord: 'venus' },
  { en: 'Uttara Ashadha', mr: 'उत्तराषाढा', lord: 'sun' },
  { en: 'Shravana', mr: 'श्रवण', lord: 'moon' },
  { en: 'Dhanishtha', mr: 'धनिष्ठा', lord: 'mars' },
  { en: 'Shatabhisha', mr: 'शतभिषा', lord: 'rahu' },
  { en: 'Purva Bhadrapada', mr: 'पूर्वा भाद्रपदा', lord: 'jupiter' },
  { en: 'Uttara Bhadrapada', mr: 'उत्तरा भाद्रपदा', lord: 'saturn' },
  { en: 'Revati', mr: 'रेवती', lord: 'mercury' },
];

const DAY_LORDS = [
  { en: 'Sunday', mr: 'रविवार', lord: 'sun' },
  { en: 'Monday', mr: 'सोमवार', lord: 'moon' },
  { en: 'Tuesday', mr: 'मंगळवार', lord: 'mars' },
  { en: 'Wednesday', mr: 'बुधवार', lord: 'mercury' },
  { en: 'Thursday', mr: 'गुरुवार', lord: 'jupiter' },
  { en: 'Friday', mr: 'शुक्रवार', lord: 'venus' },
  { en: 'Saturday', mr: 'शनिवार', lord: 'saturn' },
];

function PlanetName({ planet, lang }) {
  const p = PLANET_NAMES[planet];
  if (!p) return planet;
  return lang === 'mr' ? `${p.mr} (${p.en})` : `${p.en} (${p.mr})`;
}

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/8 transition-colors cursor-pointer text-left"
      >
        <span className="text-sm font-medium text-purple-300">{title}</span>
        <span className="text-white/30 text-xs">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function SubTableView({ lang }) {
  const [subs, setSubs] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/kp-subtable')
      .then(r => r.json())
      .then(d => { if (d.success) setSubs(d.subs); })
      .catch(() => {});
  }, []);

  if (!subs) return <div className="text-white/30 text-xs text-center py-4">Loading 249 entries...</div>;

  const filtered = search
    ? subs.filter(s =>
        String(s.n) === search ||
        s.si.toLowerCase().includes(search.toLowerCase()) ||
        s.sim.includes(search) ||
        s.nk.toLowerCase().includes(search.toLowerCase()) ||
        s.nkm.includes(search) ||
        s.sl.includes(search.toLowerCase()) ||
        s.stl.includes(search.toLowerCase()) ||
        s.sub.includes(search.toLowerCase())
      )
    : subs;

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={lang === 'mr' ? 'शोधा... (क्रमांक, राशी, नक्षत्र)' : 'Search... (number, sign, nakshatra)'}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-white/30 focus:border-purple-400/50 focus:outline-none mb-3"
      />
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#1a1025]">
            <tr className="border-b border-purple-500/20 text-purple-300/70">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">{lang === 'mr' ? 'अंश' : 'Degrees'}</th>
              <th className="text-left py-2 px-2">{lang === 'mr' ? 'राशी' : 'Sign'}</th>
              <th className="text-left py-2 px-2">{lang === 'mr' ? 'नक्षत्र' : 'Star'}</th>
              <th className="text-left py-2 px-2">{lang === 'mr' ? 'उप-स्वामी' : 'Sub'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.n} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-1.5 px-2 text-gold font-bold">{s.n}</td>
                <td className="py-1.5 px-2 text-white/40 whitespace-nowrap">{s.d[0]} - {s.d[1]}</td>
                <td className="py-1.5 px-2">
                  <span className="text-white/70">{lang === 'mr' ? s.sim : s.si}</span>
                  <span className="text-white/30 ml-1">({PLANET_NAMES[s.sl]?.[lang === 'mr' ? 'mr' : 'en']})</span>
                </td>
                <td className="py-1.5 px-2">
                  <span className="text-white/70">{lang === 'mr' ? s.nkm : s.nk}</span>
                  <span className="text-white/30 ml-1">({PLANET_NAMES[s.stl]?.[lang === 'mr' ? 'mr' : 'en']})</span>
                </td>
                <td className="py-1.5 px-2 text-purple-300 font-medium">
                  {PLANET_NAMES[s.sub]?.[lang === 'mr' ? 'mr' : 'en'] || s.sub}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-white/30 text-xs py-4">
            {lang === 'mr' ? 'कोणतेही परिणाम नाहीत' : 'No results found'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KPReferencePanel() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="card-glass">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/5 transition-colors rounded-lg"
      >
        <span className="text-sm font-medium text-purple-300/70">
          {lang === 'mr' ? '📖 संदर्भ सारण्या (राशी, नक्षत्र, उप-स्वामी)' : '📖 Reference Tables (Lords & Sub-Lords)'}
        </span>
        <span className="text-white/30 text-xs">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          {/* Rashi Lords */}
          <CollapsibleSection title={lang === 'mr' ? 'राशी स्वामी (Rashi Lords)' : 'Rashi Lords (राशी स्वामी)'} defaultOpen={true}>
            <div className="grid grid-cols-2 gap-1">
              {RASHI_LORDS.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/3">
                  <span className="text-white/70 text-xs">
                    {lang === 'mr' ? `${r.mr} (${r.en})` : `${r.en} (${r.mr})`}
                  </span>
                  <span className="text-gold text-xs font-medium">
                    <PlanetName planet={r.lord} lang={lang} />
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Nakshatra Lords */}
          <CollapsibleSection title={lang === 'mr' ? 'नक्षत्र स्वामी (Nakshatra Lords)' : 'Nakshatra Lords (नक्षत्र स्वामी)'}>
            <div className="text-white/40 text-[10px] mb-2">
              {lang === 'mr'
                ? 'क्रम: केतू → शुक्र → रवी → चंद्र → मंगळ → राहू → गुरू → शनी → बुध (पुनरावृत्ती ×3)'
                : 'Cycle: Ketu → Venus → Sun → Moon → Mars → Rahu → Jupiter → Saturn → Mercury (repeats ×3)'}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {NAKSHATRA_LORDS.map((n, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/3">
                  <span className="text-white/60 text-[11px]">
                    <span className="text-white/30 mr-1">{i + 1}.</span>
                    {lang === 'mr' ? n.mr : n.en}
                  </span>
                  <span className="text-indigo-300 text-[11px] font-medium ml-1">
                    {PLANET_NAMES[n.lord]?.[lang === 'mr' ? 'mr' : 'en']}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Day Lords */}
          <CollapsibleSection title={lang === 'mr' ? 'वार स्वामी (Day Lords)' : 'Day Lords (वार स्वामी)'}>
            <div className="grid grid-cols-2 gap-1">
              {DAY_LORDS.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/3">
                  <span className="text-white/70 text-xs">
                    {lang === 'mr' ? `${d.mr} (${d.en})` : `${d.en} (${d.mr})`}
                  </span>
                  <span className="text-gold text-xs font-medium">
                    <PlanetName planet={d.lord} lang={lang} />
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* KP 249 Sub Table */}
          <CollapsibleSection title={lang === 'mr' ? 'KP 249 उप-स्वामी सारणी (Sub Lords)' : 'KP 249 Sub-Lord Table (उप-स्वामी)'}>
            <SubTableView lang={lang} />
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
