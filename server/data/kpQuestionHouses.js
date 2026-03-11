/**
 * KP Horary question category → house mapping
 * Based on K.S. Krishnamurti, "KP Reader VI: Horary Astrology"
 *
 * favorable: houses whose signification supports a YES answer
 * unfavorable: houses whose signification supports a NO answer
 * primaryCusp: the main house cusp whose sub-lord determines the answer
 */

const KP_QUESTION_HOUSES = {
  // Book Ex.4: 7th cusp, Venus sub in dual sign + significator of 11th → YES
  marriage:        { favorable: [2, 7, 11],     unfavorable: [1, 6, 10, 12], primaryCusp: 7 },
  // Book Ex.15: 2nd cusp for money recovery; Ex.25: 10th for earnings
  finance:         { favorable: [2, 6, 11],     unfavorable: [5, 8, 12],     primaryCusp: 2 },
  // Book Ex.24: 10th cusp, Sun sub = government sector
  job:             { favorable: [2, 6, 10],     unfavorable: [1, 5, 9],      primaryCusp: 10 },
  // Book Ex.26: 10th cusp for promotion
  promotion:       { favorable: [2, 6, 10, 11], unfavorable: [5, 8, 12],     primaryCusp: 10 },
  // Book Ex.3: 3rd/9th for domestic travel
  travel:          { favorable: [3, 9, 12],     unfavorable: [1, 4, 8],      primaryCusp: 9 },
  // Book Ex.21,22: 12th cusp for foreign. House 3 = leaving residence = favorable
  foreign_travel:  { favorable: [3, 9, 12],     unfavorable: [1, 4, 8],      primaryCusp: 12 },
  // Book Ex.20: 12th cusp for going abroad for studies
  foreign_study:   { favorable: [3, 9, 12],     unfavorable: [1, 4, 8],      primaryCusp: 12 },
  // Book Ex.5,8: 4th cusp for property
  property:        { favorable: [4, 11, 12],    unfavorable: [3, 5, 10],     primaryCusp: 4 },
  // Book Ex.5: 4th cusp, Venus sub in common sign = 4-wheeled
  vehicle:         { favorable: [4, 11],        unfavorable: [3, 5, 10, 12], primaryCusp: 4 },
  // Book Ex.9,10,11: 5th cusp for children/pregnancy
  children:        { favorable: [2, 5, 11],     unfavorable: [1, 4, 10],     primaryCusp: 5 },
  pregnancy:       { favorable: [2, 5, 11],     unfavorable: [1, 4, 10],     primaryCusp: 5 },
  // Book Ex.28: 1st cusp for health recovery; 11th for cure
  health:          { favorable: [1, 5, 11],     unfavorable: [6, 8, 12],     primaryCusp: 1 },
  recovery:        { favorable: [1, 5, 11],     unfavorable: [6, 8, 12],     primaryCusp: 1 },
  // Book Ex.31: 12th cusp for imprisonment
  legal:           { favorable: [6, 11],        unfavorable: [5, 12],        primaryCusp: 6 },
  // Book Ex.31: 12th cusp — YES=imprisoned, NO=free. Houses 3,8,12 support confinement.
  imprisonment:    { favorable: [3, 8, 12],      unfavorable: [1, 2, 11],     primaryCusp: 12 },
  // Book Ex.27: 4th for education, 9th for higher
  education:       { favorable: [4, 9, 11],     unfavorable: [3, 8],         primaryCusp: 4 },
  higher_education:{ favorable: [9, 11],        unfavorable: [8, 12],        primaryCusp: 9 },
  // Book Ex.16: 12th cusp for loan repayment (money going out). Houses 5(loss to creditor),11(gains),12(expenses)
  loan_repayment:  { favorable: [5, 11, 12],    unfavorable: [6, 8],          primaryCusp: 12 },
  love:            { favorable: [5, 7, 11],     unfavorable: [6, 12],        primaryCusp: 5 },
  // Book Ex.17: 7th/10th for business
  business:        { favorable: [7, 10, 11],    unfavorable: [5, 8, 12],     primaryCusp: 7 },
  // Book Ex.18: 7th cusp for partnership. House 5 = union/love = favorable per book
  partnership:     { favorable: [3, 5, 7, 11],  unfavorable: [6, 8, 12],     primaryCusp: 7 },
  lost_item:       { favorable: [2, 6, 11],     unfavorable: [5, 8, 12],     primaryCusp: 2 },
  election:        { favorable: [6, 10, 11],    unfavorable: [5, 8, 12],     primaryCusp: 6 },
  // Book Ex.29,30: 2nd/7th/11th for missing person reunion
  missing_person:  { favorable: [2, 7, 11],     unfavorable: [3, 6, 12],     primaryCusp: 7 },
  // Book Ex.27: 11th cusp for prosperity/gains
  prosperity:      { favorable: [2, 6, 10, 11], unfavorable: [5, 8, 12],     primaryCusp: 11 },
  // Book Ex.12: 5th/11th for speculation/lottery
  speculation:     { favorable: [2, 5, 11],     unfavorable: [6, 8, 12],     primaryCusp: 5 },
  lottery:         { favorable: [2, 5, 11],     unfavorable: [6, 8, 12],     primaryCusp: 5 },
  general:         { favorable: [1, 9, 11],     unfavorable: [6, 8, 12],     primaryCusp: 11 },
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
