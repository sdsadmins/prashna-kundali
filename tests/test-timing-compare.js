const { calculateKPHorary } = require("../server/services/kpHorary");
function istDate(y,m,d,h,mi) { return new Date(Date.UTC(y,m-1,d,h-5,mi-30)); }

// Examples with specific date predictions in the book
const timingExamples = [
  {
    num: 245, date: istDate(1969,9,9,18,0), lat: 22.567, lng: 88.367, cat: "pregnancy",
    desc: "Ex.10 Childbirth",
    bookPrediction: "4/5-Oct-1969 at 2:50 AM IST",
    bookActual: "4/5-Oct-1969 2:50 AM (exact match, 26 days in advance)",
  },
  {
    num: 100, date: istDate(1969,7,2,19,30), lat: 18.917, lng: 72.833, cat: "pregnancy",
    desc: "Ex.11 Delivery",
    bookPrediction: "18-Nov-1969",
    bookActual: "confirmed",
  },
  {
    num: 29, date: istDate(1969,5,6,17,30), lat: 18.917, lng: 72.833, cat: "marriage",
    desc: "Ex.4 Marriage",
    bookPrediction: "before 20-Jun-1969",
    bookActual: "confirmed",
  },
  {
    num: 217, date: istDate(1968,12,1,17,30), lat: 18.917, lng: 72.833, cat: "vehicle",
    desc: "Ex.5 Vehicle",
    bookPrediction: "18-Oct-1974 (Sun transits Venus sign Mars star Ketu sub)",
    bookActual: "confirmed (book page 185: Ketu Anthra 28-9-1974 to 8-12-1974)",
  },
  {
    num: 208, date: istDate(1968,11,29,17,30), lat: 18.917, lng: 72.833, cat: "imprisonment",
    desc: "Ex.31 Imprisonment (NO verdict)",
    bookPrediction: "Release in Saturn sub-period, after 10-Dec-1968",
    bookActual: "Released 12-Dec-1968",
  },
  {
    num: 147, date: istDate(1969,10,10,13,30), lat: 28.617, lng: 77.217, cat: "foreign_travel",
    desc: "Ex.32 Foreign Travel",
    bookPrediction: "28-Dec-1969 early morning (Sunday)",
    bookActual: "confirmed",
  },
];

for (const ex of timingExamples) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${ex.desc} (#${ex.num})`);
  console.log(`Book prediction: ${ex.bookPrediction}`);
  console.log(`Book actual: ${ex.bookActual}`);
  
  try {
    const r = calculateKPHorary(ex.num, ex.date, ex.lat, ex.lng, ex.cat);
    const t = r.timing;
    
    console.log(`\nOur timing output:`);
    if (t.prominentDates && t.prominentDates.length > 0) {
      console.log(`  Prominent dates:`);
      t.prominentDates.forEach(d => console.log(`    ${d.date || d.description || JSON.stringify(d)}`));
    }
    if (t.sunTransit) {
      console.log(`  Sun transit: ${JSON.stringify(t.sunTransit).slice(0, 200)}`);
    }
    if (t.moonTransit) {
      console.log(`  Moon transit: ${JSON.stringify(t.moonTransit).slice(0, 200)}`);
    }
    if (t.lagnaTransit) {
      console.log(`  Lagna transit: ${JSON.stringify(t.lagnaTransit).slice(0, 200)}`);
    }
    if (t.fruitfulSignificators) {
      console.log(`  Fruitful significators: ${t.fruitfulSignificators.join(', ')}`);
    }
    
    // Print all keys
    console.log(`  All timing keys: ${Object.keys(t).join(', ')}`);
    
    // Print first-level values for each key
    for (const [k, v] of Object.entries(t)) {
      if (typeof v === 'string' || typeof v === 'number') {
        console.log(`  ${k}: ${v}`);
      } else if (Array.isArray(v) && v.length > 0) {
        console.log(`  ${k}: [${v.length} items] first: ${JSON.stringify(v[0]).slice(0, 150)}`);
      }
    }
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  }
}
