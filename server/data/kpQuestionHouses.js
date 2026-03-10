/**
 * KP Horary question category → house mapping
 * Based on K.S. Krishnamurti, "KP Reader VI: Horary Astrology"
 *
 * favorable: houses whose signification supports a YES answer
 * unfavorable: houses whose signification supports a NO answer
 * primaryCusp: the main house cusp whose sub-lord determines the answer
 */

const KP_QUESTION_HOUSES = {
  marriage:   { favorable: [2, 7, 11],  unfavorable: [1, 6, 10, 12], primaryCusp: 7 },
  finance:    { favorable: [2, 6, 11],  unfavorable: [5, 8, 12],     primaryCusp: 2 },
  job:        { favorable: [2, 6, 10],  unfavorable: [1, 5, 9],      primaryCusp: 10 },
  promotion:  { favorable: [2, 6, 10, 11], unfavorable: [5, 8, 12],  primaryCusp: 10 },
  travel:     { favorable: [3, 9, 12],  unfavorable: [1, 4, 8],      primaryCusp: 9 },
  foreign_travel: { favorable: [9, 12], unfavorable: [3, 4],         primaryCusp: 12 },
  property:   { favorable: [4, 11, 12], unfavorable: [3, 5, 10],     primaryCusp: 4 },
  vehicle:    { favorable: [4, 11],     unfavorable: [3, 5, 10, 12], primaryCusp: 4 },
  children:   { favorable: [2, 5, 11],  unfavorable: [1, 4, 10],     primaryCusp: 5 },
  health:     { favorable: [1, 5, 11],  unfavorable: [6, 8, 12],     primaryCusp: 1 },
  recovery:   { favorable: [1, 5, 11],  unfavorable: [6, 8, 12],     primaryCusp: 1 },
  legal:      { favorable: [6, 11],     unfavorable: [5, 12],        primaryCusp: 6 },
  education:  { favorable: [4, 9, 11],  unfavorable: [3, 8],         primaryCusp: 4 },
  higher_education: { favorable: [9, 11], unfavorable: [8, 12],      primaryCusp: 9 },
  love:       { favorable: [5, 7, 11],  unfavorable: [6, 12],        primaryCusp: 5 },
  business:   { favorable: [7, 10, 11], unfavorable: [5, 8, 12],     primaryCusp: 7 },
  partnership:{ favorable: [3, 7, 11],  unfavorable: [5, 8, 12],     primaryCusp: 7 },
  lost_item:  { favorable: [2, 6, 11],  unfavorable: [5, 8, 12],     primaryCusp: 2 },
  election:   { favorable: [6, 10, 11], unfavorable: [5, 8, 12],     primaryCusp: 6 },
  pregnancy:  { favorable: [2, 5, 11],  unfavorable: [1, 4, 10],     primaryCusp: 5 },
  general:    { favorable: [1, 9, 11],  unfavorable: [6, 8, 12],     primaryCusp: 11 },
};

/**
 * Get house mapping for a question category
 */
function getQuestionHouses(category) {
  const key = category.toLowerCase().replace(/\s+/g, '_');
  return KP_QUESTION_HOUSES[key] || KP_QUESTION_HOUSES.general;
}

module.exports = {
  KP_QUESTION_HOUSES,
  getQuestionHouses,
};
