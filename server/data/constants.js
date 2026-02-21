// Kalapurusha Kundali - Natural Zodiac Constants

// Sign lords mapping (0-indexed: 0=Aries, 11=Pisces)
const SIGNS = [
  { index: 0, en: 'Aries', mr: 'मेष', key: 'mesha', lord: 'mars' },
  { index: 1, en: 'Taurus', mr: 'वृषभ', key: 'vrushabh', lord: 'venus' },
  { index: 2, en: 'Gemini', mr: 'मिथुन', key: 'mithun', lord: 'mercury' },
  { index: 3, en: 'Cancer', mr: 'कर्क', key: 'kark', lord: 'moon' },
  { index: 4, en: 'Leo', mr: 'सिंह', key: 'simha', lord: 'sun' },
  { index: 5, en: 'Virgo', mr: 'कन्या', key: 'kanya', lord: 'mercury' },
  { index: 6, en: 'Libra', mr: 'तूळ', key: 'tula', lord: 'venus' },
  { index: 7, en: 'Scorpio', mr: 'वृश्चिक', key: 'vrushchik', lord: 'mars' },
  { index: 8, en: 'Sagittarius', mr: 'धनु', key: 'dhanu', lord: 'jupiter' },
  { index: 9, en: 'Capricorn', mr: 'मकर', key: 'makar', lord: 'saturn' },
  { index: 10, en: 'Aquarius', mr: 'कुंभ', key: 'kumbh', lord: 'saturn' },
  { index: 11, en: 'Pisces', mr: 'मीन', key: 'meen', lord: 'jupiter' },
];

// Planet details with Kalapurusha Ank
const PLANETS = {
  sun:     { en: 'Sun',     mr: 'रवी',   key: 'ravi',    ank: 5,  houses: [5] },
  moon:    { en: 'Moon',    mr: 'चंद्र', key: 'chandra', ank: 4,  houses: [4] },
  mars:    { en: 'Mars',    mr: 'मंगळ',  key: 'mangal',  ank: 9,  houses: [1, 8] },
  mercury: { en: 'Mercury', mr: 'बुध',   key: 'budh',    ank: 9,  houses: [3, 6] },
  jupiter: { en: 'Jupiter', mr: 'गुरू',  key: 'guru',    ank: 21, houses: [9, 12] },
  venus:   { en: 'Venus',   mr: 'शुक्र', key: 'shukra',  ank: 9,  houses: [2, 7] },
  saturn:  { en: 'Saturn',  mr: 'शनी',   key: 'shani',   ank: 21, houses: [10, 11] },
  rahu:    { en: 'Rahu',    mr: 'राहू',  key: 'rahu',    ank: null, houses: [] },
  ketu:    { en: 'Ketu',    mr: 'केतू',  key: 'ketu',    ank: null, houses: [] },
};

// 27 Nakshatras with lords (each spans 13°20' = 13.3333°)
const NAKSHATRAS = [
  { index: 0,  en: 'Ashwini',            mr: 'अश्विनी',         lord: 'ketu' },
  { index: 1,  en: 'Bharani',            mr: 'भरणी',            lord: 'venus' },
  { index: 2,  en: 'Krittika',           mr: 'कृत्तिका',        lord: 'sun' },
  { index: 3,  en: 'Rohini',             mr: 'रोहिणी',          lord: 'moon' },
  { index: 4,  en: 'Mrigashira',         mr: 'मृगशीर्ष',       lord: 'mars' },
  { index: 5,  en: 'Ardra',              mr: 'आर्द्रा',         lord: 'rahu' },
  { index: 6,  en: 'Punarvasu',          mr: 'पुनर्वसू',        lord: 'jupiter' },
  { index: 7,  en: 'Pushya',             mr: 'पुष्य',           lord: 'saturn' },
  { index: 8,  en: 'Ashlesha',           mr: 'आश्लेषा',        lord: 'mercury' },
  { index: 9,  en: 'Magha',              mr: 'मघा',             lord: 'ketu' },
  { index: 10, en: 'Purva Phalguni',     mr: 'पूर्वा फाल्गुनी', lord: 'venus' },
  { index: 11, en: 'Uttara Phalguni',    mr: 'उत्तरा फाल्गुनी', lord: 'sun' },
  { index: 12, en: 'Hasta',              mr: 'हस्त',            lord: 'moon' },
  { index: 13, en: 'Chitra',             mr: 'चित्रा',          lord: 'mars' },
  { index: 14, en: 'Swati',              mr: 'स्वाती',          lord: 'rahu' },
  { index: 15, en: 'Vishakha',           mr: 'विशाखा',          lord: 'jupiter' },
  { index: 16, en: 'Anuradha',           mr: 'अनुराधा',         lord: 'saturn' },
  { index: 17, en: 'Jyeshtha',           mr: 'ज्येष्ठा',        lord: 'mercury' },
  { index: 18, en: 'Moola',              mr: 'मूळ',             lord: 'ketu' },
  { index: 19, en: 'Purva Ashadha',      mr: 'पूर्वाषाढा',      lord: 'venus' },
  { index: 20, en: 'Uttara Ashadha',     mr: 'उत्तराषाढा',      lord: 'sun' },
  { index: 21, en: 'Shravana',           mr: 'श्रवण',           lord: 'moon' },
  { index: 22, en: 'Dhanishtha',         mr: 'धनिष्ठा',         lord: 'mars' },
  { index: 23, en: 'Shatabhisha',        mr: 'शतभिषा',          lord: 'rahu' },
  { index: 24, en: 'Purva Bhadrapada',   mr: 'पूर्वा भाद्रपदा', lord: 'jupiter' },
  { index: 25, en: 'Uttara Bhadrapada',  mr: 'उत्तरा भाद्रपदा', lord: 'saturn' },
  { index: 26, en: 'Revati',             mr: 'रेवती',           lord: 'mercury' },
];

// Day lords (0=Sunday, 6=Saturday)
const DAY_LORDS = [
  { day: 0, en: 'Sunday',    mr: 'रविवार',   lord: 'sun' },
  { day: 1, en: 'Monday',    mr: 'सोमवार',   lord: 'moon' },
  { day: 2, en: 'Tuesday',   mr: 'मंगळवार',  lord: 'mars' },
  { day: 3, en: 'Wednesday', mr: 'बुधवार',   lord: 'mercury' },
  { day: 4, en: 'Thursday',  mr: 'गुरुवार',  lord: 'jupiter' },
  { day: 5, en: 'Friday',    mr: 'शुक्रवार', lord: 'venus' },
  { day: 6, en: 'Saturday',  mr: 'शनिवार',   lord: 'saturn' },
];

// Combustion degrees (angular distance from Sun)
const COMBUSTION_DEGREES = {
  moon:    { direct: 12, retrograde: 12 },
  mars:    { direct: 17, retrograde: 17 },
  mercury: { direct: 14, retrograde: 12 },
  jupiter: { direct: 11, retrograde: 11 },
  venus:   { direct: 10, retrograde: 8 },
  saturn:  { direct: 15, retrograde: 15 },
};

// Swiss Ephemeris planet IDs
const SWE_PLANETS = {
  sun:     0,  // SE_SUN
  moon:    1,  // SE_MOON
  mercury: 2,  // SE_MERCURY
  venus:   3,  // SE_VENUS
  mars:    4,  // SE_MARS
  jupiter: 5,  // SE_JUPITER
  saturn:  6,  // SE_SATURN
  rahu:    11, // SE_MEAN_NODE (mean Rahu)
  ketu:    -1, // Ketu = Rahu + 180°
};

module.exports = {
  SIGNS,
  PLANETS,
  NAKSHATRAS,
  DAY_LORDS,
  COMBUSTION_DEGREES,
  SWE_PLANETS,
};
