# Prashna Kundali - Knowledge Base & Requirements

## What is Prashna Kundali?
Prashna Kundali (प्रश्न कुंडली) is a branch of Vedic astrology (Jyotish) where a horoscope is cast for the exact moment a question is analyzed by the astrologer (jyotishi). The answer is derived using the **KP (Krishnamurti Paddhati) Ruling Planets** combined with **Ank Shastra** (numerology).

---

## Core Method: KP Ruling Planets + Ank Shastra

### Who Uses the App
- The **jyotishi** (astrologer) is the primary user
- The **jatak** (querent/client) asks the question to the jyotishi
- The calculation is based on the **jyotishi's time and location**, not the jatak's

### Question Format
- **Yes/No (2 options)**: Jatak asks "Should I join X company?" → Options: Ho/Yes (1), Nahi/No (2)
- **Multiple choice (N options)**: Jatak asks "Which company should I join?" → Jyotishi numbers each option 1 to N
- The jatak may already have a preferred option and wants planetary confirmation (vetting)

---

## Algorithm

### Step 1: Capture Moment
When jyotishi clicks "Show Kundali / कुंडली दाखवा":
- Record exact date, time (to the second)
- Record jyotishi's geographic location (latitude, longitude)

### Step 2: Calculate Ruling Planets (4 planets)
Using **KP Ayanamsa** (Krishnamurti), determine:

| # | Component | How to Find | Planet |
|---|-----------|-------------|--------|
| 1 | **Lagna Sign Lord** | Ascendant's zodiac sign → its ruling planet | Sign lord |
| 2 | **Lagna Nakshatra Lord** | Ascendant degree → which nakshatra → its lord | Nakshatra lord |
| 3 | **Moon Sign Lord** | Moon's zodiac sign → its ruling planet | Sign lord |
| 4 | **Day Lord (Var Swami)** | Day of the week → its ruling planet | Day lord |

**Day Lord Mapping:**
| Day | Planet |
|-----|--------|
| Sunday (Ravivar / रविवार) | Ravi (Sun) |
| Monday (Somvar / सोमवार) | Chandra (Moon) |
| Tuesday (Mangalvar / मंगळवार) | Mangal (Mars) |
| Wednesday (Budhvar / बुधवार) | Budh (Mercury) |
| Thursday (Guruvar / गुरुवार) | Guru (Jupiter) |
| Friday (Shukravar / शुक्रवार) | Shukra (Venus) |
| Saturday (Shanivar / शनिवार) | Shani (Saturn) |

### Step 3: Kalapurusha Ank Mapping
Each planet's Ank (number) is derived from the **Kalapurusha Kundali** — the natural zodiac where Aries is the 1st house.

**Planet Ank = Sum of house numbers the planet rules:**

| Planet | Marathi | Rashi(s) Ruled | House Numbers | Planet Ank |
|--------|---------|---------------|:---:|:---:|
| Mangal (Mars) | मंगळ | Mesha (मेष), Vrushchik (वृश्चिक) | 1 + 8 | **9** |
| Shukra (Venus) | शुक्र | Vrushabh (वृषभ), Tula (तूळ) | 2 + 7 | **9** |
| Budh (Mercury) | बुध | Mithun (मिथुन), Kanya (कन्या) | 3 + 6 | **9** |
| Chandra (Moon) | चंद्र | Kark (कर्क) | 4 | **4** |
| Ravi (Sun) | रवी | Simha (सिंह) | 5 | **5** |
| Guru (Jupiter) | गुरू | Dhanu (धनु), Meen (मीन) | 9 + 12 | **21** |
| Shani (Saturn) | शनी | Makar (मकर), Kumbh (कुंभ) | 10 + 11 | **21** |

### Step 4: Sum & Divide
1. **Sum** the Ank values of all 4 ruling planets (include duplicates if same planet appears multiple times)
2. **Divide** the total by the number of options
3. **Remainder = Answer** (option number, 1-based)
4. **If remainder = 0 → Last option is the answer**

### Example Calculation
**Ruling planets:** Guru (21) + Ravi (5) + Budh (9) + Shukra (9) = **44**
**Options:** 2 (Yes/No)
**44 ÷ 2 = 22, Remainder = 0 → Answer = Option 2 (last option = No)**

---

## Special Rules

### 1. Retrograde Planets (Vakri / वक्री)
- If a ruling planet is **retrograde** → **SKIP it** (do not add its Ank to the sum)
- Only applies to: Mars, Mercury, Jupiter, Venus, Saturn
- Does NOT apply to Rahu/Ketu (they are always retrograde, handled separately)
- Sun and Moon are never retrograde
- Day Lord: retrograde check does not apply (it's day-based, not positional)
- Detection: Check planet's daily speed from ephemeris. If speed < 0, planet is retrograde.

### 2. Rahu & Ketu Rules
Rahu and Ketu do **not** own any zodiac signs. When they appear as a ruling planet (typically as Lagna Nakshatra Lord):

**Nakshatras ruled by Rahu:** Ardra (आर्द्रा), Swati (स्वाती), Shatabhisha (शतभिषा)
**Nakshatras ruled by Ketu:** Ashwini (अश्विनी), Magha (मघा), Moola (मूळ)

**Process:**
1. Find Rahu/Ketu's current zodiac position in the chart
2. Determine the **sign lord (rashi swami)** of where Rahu/Ketu is placed
3. Check if that sign lord is **retrograde** or **combust (asta)**:
   - If sign lord is retro or combust → **SKIP** (add nothing for this slot)
   - If sign lord is healthy (direct, not combust) → **Use that sign lord's Ank**

**CRITICAL: Rahu and Ketu are evaluated INDEPENDENTLY**
- They are NEVER treated as a pair
- One can be included while the other is excluded
- Each is evaluated solely based on its own rashi swami's status

**Example:**
- Rahu in Mesha (lord = Mars), Ketu in Tula (lord = Venus)
- Mars is direct & not combust → **Include** Rahu's Ank (= Mars's 9)
- Venus is retrograde → **Exclude** Ketu's Ank (add nothing)
- Result: Only Rahu's Ank (9) is added to the sum

### 3. Combustion (Asta / अस्त)
A planet is combust when it is too close to the Sun. Standard Vedic combustion degrees:

| Planet | Combustion Degree | If Retrograde |
|--------|:-:|:-:|
| Moon (Chandra) | 12° | — |
| Mars (Mangal) | 17° | — |
| Mercury (Budh) | 14° | 12° |
| Jupiter (Guru) | 11° | — |
| Venus (Shukra) | 10° | 8° |
| Saturn (Shani) | 15° | — |

- Combustion is checked by calculating the angular distance between the planet and the Sun
- Used specifically for the Rahu/Ketu sign lord rule

---

## Kalapurusha Kundali Reference

The natural zodiac (Kalapurusha) assigns each sign to a house number:

| House | Rashi (Sign) | Marathi | Lord | Marathi |
|:---:|---|---|---|---|
| 1 | Mesha (Aries) | मेष | Mangal (Mars) | मंगळ |
| 2 | Vrushabh (Taurus) | वृषभ | Shukra (Venus) | शुक्र |
| 3 | Mithun (Gemini) | मिथुन | Budh (Mercury) | बुध |
| 4 | Kark (Cancer) | कर्क | Chandra (Moon) | चंद्र |
| 5 | Simha (Leo) | सिंह | Ravi (Sun) | रवी |
| 6 | Kanya (Virgo) | कन्या | Budh (Mercury) | बुध |
| 7 | Tula (Libra) | तूळ | Shukra (Venus) | शुक्र |
| 8 | Vrushchik (Scorpio) | वृश्चिक | Mangal (Mars) | मंगळ |
| 9 | Dhanu (Sagittarius) | धनु | Guru (Jupiter) | गुरू |
| 10 | Makar (Capricorn) | मकर | Shani (Saturn) | शनी |
| 11 | Kumbh (Aquarius) | कुंभ | Shani (Saturn) | शनी |
| 12 | Meen (Pisces) | मीन | Guru (Jupiter) | गुरू |

---

## 27 Nakshatras & Their Lords

| # | Nakshatra | Marathi | Lord | Degree Range |
|:---:|---|---|---|---|
| 1 | Ashwini | अश्विनी | Ketu | 0°00' - 13°20' Aries |
| 2 | Bharani | भरणी | Shukra (Venus) | 13°20' - 26°40' Aries |
| 3 | Krittika | कृत्तिका | Ravi (Sun) | 26°40' Aries - 10°00' Taurus |
| 4 | Rohini | रोहिणी | Chandra (Moon) | 10°00' - 23°20' Taurus |
| 5 | Mrigashira | मृगशीर्ष | Mangal (Mars) | 23°20' Taurus - 6°40' Gemini |
| 6 | Ardra | आर्द्रा | Rahu | 6°40' - 20°00' Gemini |
| 7 | Punarvasu | पुनर्वसू | Guru (Jupiter) | 20°00' Gemini - 3°20' Cancer |
| 8 | Pushya | पुष्य | Shani (Saturn) | 3°20' - 16°40' Cancer |
| 9 | Ashlesha | आश्लेषा | Budh (Mercury) | 16°40' - 30°00' Cancer |
| 10 | Magha | मघा | Ketu | 0°00' - 13°20' Leo |
| 11 | Purva Phalguni | पूर्वा फाल्गुनी | Shukra (Venus) | 13°20' - 26°40' Leo |
| 12 | Uttara Phalguni | उत्तरा फाल्गुनी | Ravi (Sun) | 26°40' Leo - 10°00' Virgo |
| 13 | Hasta | हस्त | Chandra (Moon) | 10°00' - 23°20' Virgo |
| 14 | Chitra | चित्रा | Mangal (Mars) | 23°20' Virgo - 6°40' Libra |
| 15 | Swati | स्वाती | Rahu | 6°40' - 20°00' Libra |
| 16 | Vishakha | विशाखा | Guru (Jupiter) | 20°00' Libra - 3°20' Scorpio |
| 17 | Anuradha | अनुराधा | Shani (Saturn) | 3°20' - 16°40' Scorpio |
| 18 | Jyeshtha | ज्येष्ठा | Budh (Mercury) | 16°40' - 30°00' Scorpio |
| 19 | Moola | मूळ | Ketu | 0°00' - 13°20' Sagittarius |
| 20 | Purva Ashadha | पूर्वाषाढा | Shukra (Venus) | 13°20' - 26°40' Sagittarius |
| 21 | Uttara Ashadha | उत्तराषाढा | Ravi (Sun) | 26°40' Sagittarius - 10°00' Capricorn |
| 22 | Shravana | श्रवण | Chandra (Moon) | 10°00' - 23°20' Capricorn |
| 23 | Dhanishtha | धनिष्ठा | Mangal (Mars) | 23°20' Capricorn - 6°40' Aquarius |
| 24 | Shatabhisha | शतभिषा | Rahu | 6°40' - 20°00' Aquarius |
| 25 | Purva Bhadrapada | पूर्वा भाद्रपदा | Guru (Jupiter) | 20°00' Aquarius - 3°20' Pisces |
| 26 | Uttara Bhadrapada | उत्तरा भाद्रपदा | Shani (Saturn) | 3°20' - 16°40' Pisces |
| 27 | Revati | रेवती | Budh (Mercury) | 16°40' - 30°00' Pisces |

Each nakshatra spans **13°20'** (13.333°). To find the nakshatra from a sidereal degree:
`nakshatra_index = floor(degree / 13.333)`

---

## Technical Requirements

### Astronomical Calculations
- **Library**: Swiss Ephemeris (`swisseph` npm package)
- **Ayanamsa**: KP (Krishnamurti) — `SE_SIDM_KRISHNAMURTI`
- **Required calculations**:
  - Ascendant (Lagna) longitude for given time + lat/long
  - Moon's sidereal longitude
  - All planet positions (for Rahu/Ketu placement + retrograde/combustion checks)
  - Planet speeds (negative speed = retrograde)

### UI Requirements
- **Language**: Bilingual — Marathi (मराठी) and English, user-selectable toggle
- **Chart**: Three.js interactive 3D North Indian diamond Kundali
- **Input**: Question text, number of options, option labels
- **Output**: Kundali chart, ruling planets table, step-by-step calculation, final answer
- **Trigger**: "Show Kundali / कुंडली दाखवा" button captures the moment

### Tech Stack
- Frontend: React + Vite + TailwindCSS + Three.js (@react-three/fiber + @react-three/drei)
- Backend: Node.js + Express
- Astronomy: swisseph npm package
- i18n: JSON locale files (en.json, mr.json)
