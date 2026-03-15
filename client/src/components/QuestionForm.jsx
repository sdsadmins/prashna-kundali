import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';

// Grouped categories with bilingual labels and dropdown hints
const QUESTION_CATEGORY_GROUPS = [
  { group: { en: 'Personal & Family', mr: 'वैयक्तिक आणि कुटुंब' }, items: [
    { key: 'marriage', en: 'Marriage', mr: 'विवाह', hint: { en: 'Will I get married?', mr: 'लग्न होईल का?' } },
    { key: 'divorce', en: 'Divorce / Separation', mr: 'घटस्फोट', hint: { en: 'Will separation happen?', mr: 'विभक्त होईल का?' } },
    { key: 'reconciliation', en: 'Reconciliation', mr: 'पुनर्मिलन', hint: { en: 'Will we reunite?', mr: 'पुन्हा एकत्र येऊ का?' } },
    { key: 'love', en: 'Love / Romance', mr: 'प्रेम', hint: { en: 'Will love succeed?', mr: 'प्रेम यशस्वी होईल?' } },
    { key: 'children', en: 'Children', mr: 'अपत्य', hint: { en: 'Will I have children?', mr: 'मूल होईल का?' } },
    { key: 'pregnancy', en: 'Pregnancy', mr: 'गर्भधारणा', hint: { en: 'Will I conceive?', mr: 'गर्भधारणा होईल?' } },
    { key: 'missing_person', en: 'Missing Person', mr: 'बेपत्ता व्यक्ती', hint: { en: 'Will they return?', mr: 'ते परत येतील?' } },
  ]},
  { group: { en: 'Career & Finance', mr: 'करिअर आणि अर्थ' }, items: [
    { key: 'job', en: 'Job / Career', mr: 'नोकरी', hint: { en: 'Will I get the job?', mr: 'नोकरी मिळेल?' } },
    { key: 'promotion', en: 'Promotion', mr: 'पदोन्नती', hint: { en: 'Will I get promoted?', mr: 'पदोन्नती होईल?' } },
    { key: 'transfer', en: 'Transfer', mr: 'बदली', hint: { en: 'Will I get transferred?', mr: 'बदली होईल?' } },
    { key: 'reinstatement', en: 'Reinstatement', mr: 'पुनर्स्थापना', hint: { en: 'Will I get my job back?', mr: 'नोकरी परत मिळेल?' } },
    { key: 'business', en: 'Business', mr: 'व्यवसाय', hint: { en: 'Will business succeed?', mr: 'व्यवसाय यशस्वी होईल?' } },
    { key: 'partnership', en: 'Partnership', mr: 'भागीदारी', hint: { en: 'Will partnership work?', mr: 'भागीदारी यशस्वी?' } },
    { key: 'finance', en: 'Finance / Money', mr: 'आर्थिक', hint: { en: 'Will I get money?', mr: 'पैसे मिळतील?' } },
    { key: 'loan_repayment', en: 'Loan Repayment', mr: 'कर्ज फेड', hint: { en: 'Will loan be repaid?', mr: 'कर्ज फिटेल?' } },
    { key: 'borrowing', en: 'Borrowing', mr: 'उधारी', hint: { en: 'Will I get a loan?', mr: 'कर्ज मिळेल?' } },
    { key: 'debt_recovery', en: 'Debt Recovery', mr: 'कर्ज वसुली', hint: { en: 'Will debtor pay back?', mr: 'कर्जदार पैसे देईल?' } },
    { key: 'government_benefit', en: 'Government Benefit', mr: 'शासकीय लाभ', hint: { en: 'Pension, subsidy, grant?', mr: 'पेन्शन, अनुदान?' } },
    { key: 'inheritance', en: 'Inheritance', mr: 'वारसा', hint: { en: 'Will I receive inheritance?', mr: 'वारसा मिळेल?' } },
    { key: 'lottery', en: 'Lottery / Speculation', mr: 'लॉटरी / सट्टा', hint: { en: 'Will I win?', mr: 'जिंकेन का?' } },
    { key: 'prosperity', en: 'Prosperity / Gains', mr: 'समृद्धी', hint: { en: 'Will I prosper?', mr: 'समृद्धी होईल?' } },
  ]},
  { group: { en: 'Education', mr: 'शिक्षण' }, items: [
    { key: 'education', en: 'Education', mr: 'शिक्षण', hint: { en: 'Will I pass exams?', mr: 'परीक्षा उत्तीर्ण होईल?' } },
    { key: 'higher_education', en: 'Higher Education', mr: 'उच्च शिक्षण', hint: { en: 'Masters, PhD admission?', mr: 'एमए, पीएचडी प्रवेश?' } },
    { key: 'competitive_exam', en: 'Competitive Exam', mr: 'स्पर्धा परीक्षा', hint: { en: 'UPSC, MPSC, NEET, JEE...', mr: 'UPSC, MPSC, NEET...' } },
    { key: 'scholarship', en: 'Scholarship', mr: 'शिष्यवृत्ती', hint: { en: 'Will I get scholarship?', mr: 'शिष्यवृत्ती मिळेल?' } },
    { key: 'foreign_study', en: 'Foreign Study', mr: 'परदेशी शिक्षण', hint: { en: 'Study abroad admission?', mr: 'परदेशी शिक्षण मिळेल?' } },
  ]},
  { group: { en: 'Health', mr: 'आरोग्य' }, items: [
    { key: 'health', en: 'Health / Recovery', mr: 'आरोग्य', hint: { en: 'Will I recover?', mr: 'बरे होईल?' } },
    { key: 'cure', en: 'Cure / Treatment', mr: 'उपचार', hint: { en: 'Will treatment work?', mr: 'उपचार यशस्वी?' } },
    { key: 'surgery', en: 'Surgery', mr: 'शस्त्रक्रिया', hint: { en: 'Will surgery succeed?', mr: 'शस्त्रक्रिया यशस्वी?' } },
  ]},
  { group: { en: 'Travel & Property', mr: 'प्रवास आणि मालमत्ता' }, items: [
    { key: 'travel', en: 'Travel', mr: 'प्रवास', hint: { en: 'Will journey happen?', mr: 'प्रवास होईल?' } },
    { key: 'travel_safety', en: 'Travel Safety', mr: 'प्रवास सुरक्षा', hint: { en: 'Will journey be safe?', mr: 'प्रवास सुरक्षित?' } },
    { key: 'foreign_travel', en: 'Foreign Travel', mr: 'परदेश प्रवास', hint: { en: 'Visa, settle abroad?', mr: 'व्हिसा, परदेश?' } },
    { key: 'property', en: 'Property / House', mr: 'मालमत्ता', hint: { en: 'Will I buy/sell?', mr: 'खरेदी/विक्री होईल?' } },
    { key: 'vehicle', en: 'Vehicle', mr: 'वाहन', hint: { en: 'Will I get a vehicle?', mr: 'वाहन मिळेल?' } },
  ]},
  { group: { en: 'Legal', mr: 'कायदेशीर' }, items: [
    { key: 'legal', en: 'Legal / Court', mr: 'कायदेशीर', hint: { en: 'Will I win the case?', mr: 'केस जिंकेन?' } },
    { key: 'imprisonment', en: 'Imprisonment', mr: 'कारावास', hint: { en: 'Will they be jailed?', mr: 'तुरुंगवास होईल?' } },
    { key: 'election', en: 'Election / Competition', mr: 'निवडणूक', hint: { en: 'Will I/they win?', mr: 'जिंकतील का?' } },
  ]},
  { group: { en: 'Other', mr: 'इतर' }, items: [
    { key: 'lost_item', en: 'Lost Item', mr: 'हरवलेली वस्तू', hint: { en: 'Will I find it?', mr: 'सापडेल का?' } },
    { key: 'war', en: 'War / Conflict', mr: 'युद्ध / संघर्ष', hint: { en: 'Will war/conflict end?', mr: 'युद्ध संपेल?' } },
    { key: 'seva', en: 'Seva / Spiritual Service', mr: 'सेवा / आध्यात्मिक सेवा', hint: { en: 'Guru seva, dharma work?', mr: 'गुरु सेवा, धर्म कार्य?' } },
    { key: 'general', en: 'General', mr: 'सामान्य', hint: { en: 'Any yes/no question', mr: 'कोणताही प्रश्न' } },
  ]},
];

// Rich keyword dictionary for auto-detection (EN + MR + HI)
// Priority: specific categories checked before general ones
const CATEGORY_KEYWORDS = {
  competitive_exam: [
    'competitive exam', 'competitive examination', 'upsc', 'mpsc', 'ssc', 'gate',
    'neet', 'jee', 'cat exam', 'entrance exam', 'civil service', 'ias', 'ips',
    'bank exam', 'railway exam', 'defence exam', 'nda', 'cds', 'clat',
    'स्पर्धा परीक्षा', 'प्रतियोगी परीक्षा', 'प्रवेश परीक्षा',
    'यूपीएससी', 'एमपीएससी',
  ],
  foreign_study: [
    'study abroad', 'foreign study', 'foreign university', 'overseas education',
    'ms abroad', 'mba abroad', 'gre', 'toefl', 'ielts', 'study visa',
    'परदेशी शिक्षण', 'विदेश में पढ़ाई',
  ],
  foreign_travel: [
    'abroad', 'foreign country', 'overseas', 'visa', 'immigration', 'emigrate',
    'green card', 'h1b', 'passport', 'settle abroad', 'go to usa', 'go to uk',
    'go to canada', 'go to australia', 'foreign land', 'foreign trip',
    'परदेश', 'परदेशात', 'विदेश', 'विदेश यात्रा', 'व्हिसा',
  ],
  higher_education: [
    'higher education', 'masters', 'phd', 'doctorate', 'post graduate',
    'postgraduate', 'mba', 'mtech', 'msc', 'ma degree',
    'उच्च शिक्षण', 'पदव्युत्तर', 'एमबीए',
  ],
  loan_repayment: [
    'loan repay', 'repay loan', 'loan repayment', 'pay off loan', 'emi',
    'mortgage repay', 'clear debt', 'settle loan',
    'कर्ज फेड', 'कर्ज फिटेल', 'लोन भरणे',
  ],
  debt_recovery: [
    'debt recovery', 'recover debt', 'money back from', 'debtor', 'owed money',
    'will he pay', 'will she pay', 'return my money', 'get money back',
    'कर्ज वसुली', 'पैसे परत', 'उधार परत',
  ],
  government_benefit: [
    'government benefit', 'pension', 'subsidy', 'government grant', 'sarkari',
    'govt scheme', 'government scheme', 'social security', 'provident fund', 'pf',
    'शासकीय लाभ', 'पेन्शन', 'अनुदान', 'सरकारी योजना',
  ],
  travel_safety: [
    'travel safe', 'journey safe', 'safe travel', 'travel safety', 'accident',
    'road safety', 'flight safe', 'dangerous journey',
    'प्रवास सुरक्षित', 'प्रवास सुरक्षा', 'अपघात',
  ],
  missing_person: [
    'missing person', 'missing child', 'missing husband', 'missing wife',
    'gone missing', 'disappeared', 'run away', 'absconding', 'whereabouts',
    'बेपत्ता', 'हरवलेली व्यक्ती', 'लापता', 'गायब',
  ],
  lost_item: [
    'lost item', 'lost thing', 'lost gold', 'lost ring', 'lost phone', 'lost wallet',
    'lost jewel', 'stolen', 'theft', 'missing item', 'find my', 'recover item',
    'हरवलेली वस्तू', 'चोरी', 'सापडेल', 'गहाळ',
    'खोया हुआ', 'चोरी हुआ',
  ],
  divorce: [
    'divorce', 'separation', 'split up', 'break up', 'breakup', 'alimony',
    'separate from', 'end marriage', 'leave husband', 'leave wife',
    'घटस्फोट', 'विभक्त', 'तलाक', 'अलगाव',
  ],
  reconciliation: [
    'reconcile', 'reconciliation', 'reunite', 'get back together', 'patch up',
    'make up with', 'come back to me',
    'पुनर्मिलन', 'परत येईल', 'एकत्र येऊ',
  ],
  surgery: [
    'surgery', 'operation', 'surgical', 'transplant', 'bypass', 'appendix',
    'knee replacement', 'hip replacement', 'c-section', 'cesarean',
    'शस्त्रक्रिया', 'ऑपरेशन', 'सर्जरी',
  ],
  cure: [
    'cure', 'treatment', 'therapy', 'medicine work', 'remedy', 'heal',
    'ayurvedic', 'homeopathy', 'chemotherapy',
    'उपचार', 'इलाज', 'दवाई',
  ],
  pregnancy: [
    'pregnant', 'pregnancy', 'conceive', 'conception', 'baby', 'expecting',
    'fertility', 'ivf', 'iui',
    'गर्भवती', 'गर्भधारणा', 'गर्भ',
  ],
  marriage: [
    'marry', 'marriage', 'married', 'wedding', 'spouse', 'wife', 'husband',
    'bride', 'groom', 'engagement', 'engaged', 'rishta', 'alliance',
    'nikah', 'shaadi', 'manglik', 'matrimony', 'wedlock', 'match',
    'विवाह', 'लग्न', 'नवरा', 'बायको', 'वधू', 'वर', 'साखरपुडा', 'मंगलसूत्र',
    'शादी', 'पत्नी', 'पति', 'दुल्हन', 'दूल्हा', 'रिश्ता', 'मंगनी',
  ],
  job: [
    'job', 'employment', 'career', 'position', 'hire', 'hired', 'get selected',
    'recruitment', 'interview', 'offer letter', 'joining', 'resign', 'placement',
    'naukri', 'नोकरी', 'कामावर', 'नियुक्ती', 'नौकरी', 'रोजगार',
  ],
  promotion: [
    'promotion', 'promoted', 'increment', 'raise', 'appraisal', 'hike',
    'पदोन्नती', 'वेतनवाढ', 'तरक्की',
  ],
  transfer: [
    'transfer', 'transferred', 'posting', 'relocation', 'deputation',
    'बदली', 'स्थानांतर', 'तबादला',
  ],
  reinstatement: [
    'reinstate', 'reinstatement', 'get job back', 'rejoin', 'suspended',
    'termination appeal', 'dismissal appeal',
    'पुनर्स्थापना', 'बहाली',
  ],
  finance: [
    'money', 'financial', 'income', 'earning', 'salary', 'payment', 'dues',
    'profit', 'revenue', 'wealth', 'rich',
    'पैसे', 'आर्थिक', 'उत्पन्न', 'कमाई', 'धन',
  ],
  borrowing: [
    'borrow', 'borrowing', 'loan', 'lend', 'credit', 'mortgage',
    'कर्ज', 'उधार', 'लोन',
  ],
  inheritance: [
    'inheritance', 'inherit', 'will property', 'ancestral', 'legacy',
    'father property', 'mother property', 'family property',
    'वारसा', 'पैतृक', 'विरासत',
  ],
  lottery: [
    'lottery', 'gamble', 'gambling', 'speculation', 'jackpot', 'raffle',
    'betting', 'satta', 'matka', 'lucky draw',
    'लॉटरी', 'सट्टा', 'जुगार', 'लकी ड्रॉ',
  ],
  prosperity: [
    'prosperity', 'prosper', 'flourish', 'gains', 'successful', 'success',
    'progress', 'growth',
    'समृद्धी', 'भरभराट', 'प्रगती', 'सफलता',
  ],
  education: [
    'education', 'exam', 'study', 'school', 'college', 'university', 'degree',
    'pass', 'fail', 'result', 'marks', 'grade', 'admission',
    'शिक्षण', 'परीक्षा', 'अभ्यास', 'शाळा', 'कॉलेज',
    'पढ़ाई', 'पास', 'फेल',
  ],
  scholarship: [
    'scholarship', 'stipend', 'fellowship', 'bursary', 'grant',
    'शिष्यवृत्ती', 'छात्रवृत्ती',
  ],
  health: [
    'health', 'sick', 'illness', 'disease', 'unwell', 'fever', 'diagnosed',
    'hospital', 'icu', 'critical', 'condition', 'survive', 'recover',
    'cancer', 'diabetes', 'heart', 'kidney', 'liver',
    'आरोग्य', 'आजार', 'तब्येत', 'बीमारी', 'स्वास्थ्य', 'बरे',
  ],
  children: [
    'child', 'son', 'daughter', 'kids', 'offspring',
    'मुलगा', 'मुलगी', 'अपत्य', 'बेटा', 'बेटी', 'संतान',
  ],
  property: [
    'property', 'house', 'flat', 'apartment', 'land', 'plot', 'real estate',
    'buy house', 'sell house', 'buy flat', 'sell flat', 'construction',
    'मालमत्ता', 'घर', 'फ्लॅट', 'जमीन', 'भूखंड',
  ],
  vehicle: [
    'vehicle', 'car', 'bike', 'scooter', 'motorcycle', 'truck', 'bus',
    'buy car', 'new car', 'new bike',
    'वाहन', 'गाडी', 'कार', 'बाइक', 'स्कूटर',
  ],
  legal: [
    'legal', 'court', 'case', 'lawsuit', 'litigation', 'advocate', 'lawyer',
    'judge', 'verdict', 'bail', 'acquit', 'trial', 'hearing',
    'कायदेशीर', 'न्यायालय', 'खटला', 'केस', 'वकील',
    'कोर्ट', 'मुकदमा',
  ],
  imprisonment: [
    'prison', 'jail', 'imprison', 'arrested', 'custody', 'detention',
    'behind bars', 'locked up', 'sentence',
    'कारावास', 'तुरुंग', 'अटक', 'जेल', 'कैद',
  ],
  election: [
    'election', 'vote', 'candidate', 'contest', 'political', 'win election',
    'निवडणूक', 'मतदान', 'उमेदवार', 'चुनाव',
  ],
  business: [
    'business', 'startup', 'start-up', 'enterprise', 'venture', 'company',
    'firm', 'shop', 'store', 'trade', 'commerce',
    'व्यवसाय', 'उद्योग', 'दुकान', 'व्यापार', 'कारोबार',
  ],
  partnership: [
    'partner', 'partnership', 'co-founder', 'joint venture', 'collaboration',
    'भागीदारी', 'साझेदारी',
  ],
  love: [
    'love', 'romance', 'relationship', 'boyfriend', 'girlfriend', 'dating',
    'affair', 'crush', 'propose',
    'प्रेम', 'प्रियकर', 'प्रेयसी', 'प्यार', 'इश्क',
  ],
  travel: [
    'travel', 'trip', 'journey', 'tour', 'visit', 'go to', 'moving',
    'प्रवास', 'सफर', 'यात्रा',
  ],
  war: [
    'war', 'conflict', 'battle', 'attack', 'invasion', 'ceasefire', 'peace',
    'military', 'army', 'troops', 'bombing', 'missile', 'nuclear',
    'iran', 'israel', 'russia', 'ukraine', 'pakistan', 'china',
    'युद्ध', 'संघर्ष', 'लढाई', 'हमला', 'शांती', 'जंग', 'हल्ला',
  ],
  seva: [
    'seva', 'service to guru', 'gurudev', 'guru seva', 'spiritual service',
    'ashram', 'dharma', 'dharma work', 'devotion', 'devotee', 'disciple',
    'secretary', 'personal secretary', 'serve guru', 'divine service',
    'सेवा', 'गुरुदेव', 'गुरु सेवा', 'आश्रम', 'धर्म', 'भक्ती', 'शिष्य',
  ],
};

// Priority order for auto-detection: specific before general
const DETECT_PRIORITY = [
  'competitive_exam', 'foreign_study', 'foreign_travel', 'higher_education',
  'loan_repayment', 'debt_recovery', 'government_benefit', 'travel_safety',
  'missing_person', 'lost_item',
  'divorce', 'reconciliation', 'surgery', 'cure', 'pregnancy',
  'seva', 'marriage', 'job', 'promotion', 'transfer', 'reinstatement',
  'finance', 'borrowing', 'inheritance', 'lottery', 'prosperity',
  'education', 'scholarship',
  'health', 'children', 'property', 'vehicle',
  'legal', 'imprisonment', 'election',
  'business', 'partnership', 'love', 'travel', 'war',
];

function detectCategory(text) {
  const normalized = text.toLowerCase();
  for (const cat of DETECT_PRIORITY) {
    const keywords = CATEGORY_KEYWORDS[cat] || [];
    for (const kw of keywords) {
      if (normalized.includes(kw.toLowerCase())) return cat;
    }
  }
  return null;
}

export default function QuestionForm({ onCalculate, isLoading, initialMode, onModeChange }) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState(initialMode || 'ank');

  const handleModeChange = (m) => {
    setMode(m);
    onModeChange?.(m);
  };
  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState('yesno');
  const [options, setOptions] = useState([
    lang === 'mr' ? 'हो' : 'Yes',
    lang === 'mr' ? 'नाही' : 'No',
  ]);
  const [horaryNumber, setHoraryNumber] = useState('');
  const [questionCategory, setQuestionCategory] = useState('');
  const [kpQuestionType, setKpQuestionType] = useState('yesno');
  const [autoDetected, setAutoDetected] = useState(false);
  const [showCategoryHelp, setShowCategoryHelp] = useState(false);

  // Auto-detect category from question text
  useEffect(() => {
    if (mode === 'kp' && question.trim()) {
      const detected = detectCategory(question);
      if (detected) {
        setQuestionCategory(detected);
        setAutoDetected(true);
      } else {
        setAutoDetected(false);
      }
    } else {
      setAutoDetected(false);
    }
  }, [question, mode]);

  useEffect(() => {
    if (questionType === 'yesno') {
      setOptions([lang === 'mr' ? 'हो' : 'Yes', lang === 'mr' ? 'नाही' : 'No']);
    }
  }, [lang, questionType]);

  const handleTypeChange = (type) => {
    setQuestionType(type);
    if (type === 'yesno') {
      setOptions([lang === 'mr' ? 'हो' : 'Yes', lang === 'mr' ? 'नाही' : 'No']);
    } else {
      setOptions(['', '', '']);
    }
  };

  const addOption = () => {
    if (options.length < 12) setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const allOptionsFilled = questionType === 'yesno' || options.every((o) => o.trim());

  const handleSubmit = () => {
    if (!question.trim()) return;
    if (mode === 'kp') {
      const num = parseInt(horaryNumber);
      if (!num || num < 1 || num > 249) return;
      onCalculate({ question, mode: 'kp', horaryNumber: num, questionCategory, kpQuestionType });
    } else {
      if (!allOptionsFilled) return;
      const filledOptions = options.map((o, i) => o.trim() || `${t('optionPlaceholder')} ${i + 1}`);
      onCalculate({ question, options: filledOptions, optionsCount: filledOptions.length, mode: 'ank' });
    }
  };

  const isSubmitDisabled = isLoading || !question.trim() ||
    (mode === 'ank' && !allOptionsFilled) ||
    (mode === 'kp' && (!horaryNumber || parseInt(horaryNumber) < 1 || parseInt(horaryNumber) > 249 || !questionCategory));

  return (
    <div className="card-glass p-6 space-y-5">
      {/* Mode Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        <button
          onClick={() => handleModeChange('ank')}
          className={`flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer ${
            mode === 'ank'
              ? 'bg-gold/20 text-gold border-r border-gold/30'
              : 'bg-white/5 text-white/50 border-r border-white/10 hover:bg-white/10'
          }`}
        >
          {lang === 'mr' ? 'अंक शास्त्र' : 'Ank Shastra'}
        </button>
        <button
          onClick={() => handleModeChange('kp')}
          className={`flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer ${
            mode === 'kp'
              ? 'bg-purple-500/20 text-purple-300 border-l border-purple-500/30'
              : 'bg-white/5 text-white/50 border-l border-white/10 hover:bg-white/10'
          }`}
        >
          {lang === 'mr' ? 'केपी होरारी' : 'KP Horary'}
        </button>
      </div>

      {/* Question Input */}
      <div>
        <label className="block text-gold text-sm font-medium mb-2">{t('questionLabel')}</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('questionPlaceholder')}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:border-gold/50 focus:outline-none resize-none"
          rows={2}
        />
      </div>

      {/* KP Mode: Horary Number + Category */}
      {mode === 'kp' && (
        <>
          <div>
            <label className="flex items-center gap-2 text-purple-300 text-sm font-medium mb-2">
              {lang === 'mr' ? 'होरारी क्रमांक (1-249)' : 'Horary Number (1-249)'}
              <span className="relative group cursor-help">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-purple-400/50 text-purple-300 text-[10px] leading-none select-none">?</span>
                <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-80 bg-[#1a1025] border border-purple-500/30 rounded-xl shadow-2xl p-4 text-xs text-white/80 leading-relaxed">
                  <div className="text-purple-300 font-semibold mb-2">
                    {lang === 'mr' ? 'प्रश्न कधी विचारावा?' : 'When to Ask a Question?'}
                  </div>
                  <div className="space-y-2">
                    <p><span className="text-purple-200 font-medium">{lang === 'mr' ? 'KP पद्धती:' : 'KP System:'}</span>{' '}{lang === 'mr' ? 'दिवसाची वेळ, वार किंवा तिथी यांचे कोणतेही बंधन नाही. न्यायाधीशाच्या वेळेत सत्य प्रकट होते.' : 'No restrictions on time of day, day of week, or lunar phase. Truth reveals itself through the Ruling Planets at the moment of judgment.'}</p>
                    <p><span className="text-purple-200 font-medium">{lang === 'mr' ? 'परंपरागत नियम (ज्योतिष ग्रंथ):' : 'Traditional rules (classic texts):'}</span></p>
                    <ul className="list-disc pl-3 space-y-1 text-white/60">
                      <li>{lang === 'mr' ? 'सकाळची वेळ उत्तम; दुपार, संध्याकाळ, रात्र टाळावी' : 'Morning preferred; avoid afternoon, twilight & night'}</li>
                      <li>{lang === 'mr' ? 'पूर्व किंवा उत्तर दिशेकडे तोंड करून विचारावे' : 'Face east or north when asking'}</li>
                      <li>{lang === 'mr' ? 'स्मशानभूमी, रुग्णालय, कत्तलखाना यांसारख्या ठिकाणी विचारणे टाळा' : 'Avoid asking in graveyards, hospitals, slaughterhouses'}</li>
                      <li>{lang === 'mr' ? 'वारावर कोणतेही बंधन नाही; तिथी किंवा चंद्र कलेवर बंधन नाही' : 'No restriction on day of week, tithi, or lunar phase'}</li>
                    </ul>
                    <p><span className="text-purple-200 font-medium">{lang === 'mr' ? 'जातकाची प्रामाणिकता:' : 'Querist sincerity:'}</span>{' '}{lang === 'mr' ? 'प्रश्न मनापासून असेल तरच उत्तर खरे निघते. ग्रह स्वतःच खरे-खोटे दाखवतात.' : 'Only a sincere question yields a true answer. The Ruling Planets reveal authenticity automatically.'}</p>
                    <p><span className="text-purple-200 font-medium">{lang === 'mr' ? 'महत्त्वाचा नियम:' : 'One hard rule:'}</span>{' '}{lang === 'mr' ? '249 पेक्षा जास्त क्रमांक दिल्यास इच्छा पूर्ण होणार नाही असे KP म्हणतात.' : 'KP states: if the querist gives a number above 249, the matter will not materialise.'}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 text-white/30 text-[10px]">
                    {lang === 'mr' ? 'स्रोत: KP Reader VI — होरारी ज्योतिष (के.एस. कृष्णमूर्ती)' : 'Source: KP Reader VI — Horary Astrology (K.S. Krishnamurti)'}
                  </div>
                </div>
              </span>
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                min="1"
                max="249"
                value={horaryNumber}
                onChange={(e) => setHoraryNumber(e.target.value)}
                placeholder="1-249"
                className="w-32 bg-white/5 border border-purple-500/30 rounded-lg p-3 text-white text-center text-lg font-bold placeholder-white/30 focus:border-purple-400/60 focus:outline-none"
              />
              <div className="text-white/40 text-xs leading-tight">
                {lang === 'mr'
                  ? 'जातकाला 1 ते 249 मधील कोणताही क्रमांक सांगायला सांगा'
                  : 'Ask the querist to think of any number between 1 and 249'}
              </div>
            </div>
          </div>
          {/* Question Type toggle */}
          <div>
            <label className="block text-purple-300 text-sm font-medium mb-2">
              {lang === 'mr' ? 'प्रश्नाचा प्रकार' : 'Question Type'}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-purple-500/20">
              <button
                onClick={() => setKpQuestionType('yesno')}
                className={`flex-1 py-2 text-xs font-medium transition-all cursor-pointer ${
                  kpQuestionType === 'yesno'
                    ? 'bg-purple-500/20 text-purple-300 border-r border-purple-500/30'
                    : 'bg-white/5 text-white/40 border-r border-white/10 hover:bg-white/10'
                }`}
              >
                {lang === 'mr' ? 'हे होईल का?' : 'Will it happen?'}
              </button>
              <button
                onClick={() => setKpQuestionType('timing')}
                className={`flex-1 py-2 text-xs font-medium transition-all cursor-pointer ${
                  kpQuestionType === 'timing'
                    ? 'bg-indigo-500/20 text-indigo-300 border-l border-indigo-500/30'
                    : 'bg-white/5 text-white/40 border-l border-white/10 hover:bg-white/10'
                }`}
              >
                {lang === 'mr' ? 'हे कधी होईल?' : 'When will it happen?'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-purple-300 text-sm font-medium mb-2">
              {lang === 'mr' ? 'प्रश्न विषय' : 'Question Category'}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <select
              value={questionCategory}
              onChange={(e) => { setQuestionCategory(e.target.value); setAutoDetected(false); }}
              className={`w-full bg-white/5 border rounded-lg p-3 text-white focus:border-purple-400/60 focus:outline-none appearance-none cursor-pointer ${
                !questionCategory ? 'border-red-400/50' : 'border-purple-500/30'
              }`}
            >
              <option value="" disabled className="bg-gray-900 text-white/50">
                {lang === 'mr' ? '-- प्रश्न प्रकार निवडा --' : '-- Select Category --'}
              </option>
              {QUESTION_CATEGORY_GROUPS.map((g) => (
                <optgroup key={g.group.en} label={lang === 'mr' ? g.group.mr : g.group.en} className="bg-gray-900 text-white">
                  {g.items.map((cat) => (
                    <option key={cat.key} value={cat.key} className="bg-gray-900 text-white">
                      {lang === 'mr' ? `${cat.mr} (${cat.hint.mr})` : `${cat.en} (${cat.hint.en})`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {autoDetected && questionCategory && (
              <p className="text-red-400 text-xs mt-1">
                {lang === 'mr'
                  ? '⚠️ प्रश्न प्रकार स्वयं ओळखला. कृपया योग्य प्रकार तपासा.'
                  : '⚠️ Category auto-detected. Please verify correct category.'}
              </p>
            )}
            {!questionCategory && question.trim() && (
              <p className="text-red-400/70 text-xs mt-1">
                {lang === 'mr' ? 'कृपया प्रश्न प्रकार निवडा' : 'Please select a question category'}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowCategoryHelp(!showCategoryHelp)}
              className="mt-2 text-xs text-white/40 hover:text-white/70 bg-transparent border-none cursor-pointer transition-colors"
            >
              {showCategoryHelp ? '▼' : '▶'} {lang === 'mr' ? '❓ प्रकार कसा निवडावा?' : '❓ How to choose category?'}
            </button>
            {showCategoryHelp && (
              <div className="mt-2 text-xs text-white/60 bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                <p className="text-purple-300 font-medium">
                  {lang === 'mr'
                    ? 'KP होरारी नेहमी प्रश्नकर्त्याच्या दृष्टिकोनातून विश्लेषण करते.'
                    : 'KP Horary always analyzes from YOUR perspective as the querist.'}
                </p>
                <div>
                  <p className="text-white/50 mb-1">{lang === 'mr' ? 'अमूर्त/जागतिक प्रश्नांसाठी, वैयक्तिक प्रभाव म्हणून विचारा:' : 'For abstract/world events, frame as personal impact:'}</p>
                  <div className="pl-2 space-y-0.5">
                    <p className="text-red-400/70">✗ {lang === 'mr' ? '"युद्ध होईल का?"' : '"Will there be war?"'}</p>
                    <p className="text-green-400/70">✓ {lang === 'mr' ? '"युद्धामुळे माझ्या सुरक्षिततेवर परिणाम होईल?" → प्रवास सुरक्षा' : '"Will the war affect my safety?" → Travel Safety'}</p>
                    <p className="text-green-400/70">✓ {lang === 'mr' ? '"युद्धामुळे माझ्या व्यवसायावर परिणाम होईल?" → व्यवसाय' : '"Will the war impact my business?" → Business'}</p>
                    <p className="text-green-400/70">✓ {lang === 'mr' ? '"सैन्यातील माझा मुलगा सुरक्षित आहे?" → आरोग्य' : '"Will my son in the army be safe?" → Health'}</p>
                  </div>
                </div>
                <p className="text-white/40 border-t border-white/10 pt-2">
                  {lang === 'mr'
                    ? 'कोणताही प्रकार जुळत नसल्यास → "सामान्य" निवडा (गृह ११ = इच्छापूर्ती)'
                    : 'If no category fits → select "General" (house 11 = fulfillment of desires)'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Ank Mode: Question Type + Options */}
      {mode === 'ank' && (
        <>
          <div>
            <label className="block text-gold text-sm font-medium mb-2">{t('questionType')}</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleTypeChange('yesno')}
                className={`px-4 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                  questionType === 'yesno'
                    ? 'bg-gold/20 border-gold text-gold border'
                    : 'bg-white/5 border-white/10 text-white/60 border hover:bg-white/10'
                }`}
              >
                {t('yesNo')}
              </button>
              <button
                onClick={() => handleTypeChange('multi')}
                className={`px-4 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                  questionType === 'multi'
                    ? 'bg-gold/20 border-gold text-gold border'
                    : 'bg-white/5 border-white/10 text-white/60 border hover:bg-white/10'
                }`}
              >
                {t('multipleChoice')}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-gold text-sm font-medium mb-2">
              {t('optionsLabel')} ({options.length})
              {questionType === 'multi' && !allOptionsFilled && (
                <span className="ml-2 text-saffron/70 text-xs font-normal">
                  {lang === 'mr' ? '— सर्व पर्याय भरा' : '— fill all options'}
                </span>
              )}
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    opt.trim()
                      ? 'bg-gold/20 text-gold border border-gold/30'
                      : 'bg-white/5 text-white/30 border border-white/10'
                  }`}>{i + 1}</span>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={
                      questionType === 'yesno'
                        ? (i === 0 ? (lang === 'mr' ? 'हो' : 'Yes') : (lang === 'mr' ? 'नाही' : 'No'))
                        : `${t('optionPlaceholder')} ${i + 1} — ${lang === 'mr' ? 'नाव लिहा' : 'enter name'}`
                    }
                    disabled={questionType === 'yesno'}
                    className={`flex-1 border rounded-lg px-3 py-2 text-white placeholder-white/30 focus:border-gold/50 focus:outline-none text-sm transition-all ${
                      questionType === 'yesno'
                        ? 'bg-white/3 border-white/5 opacity-70'
                        : opt.trim() ? 'bg-white/8 border-gold/30' : 'bg-white/5 border-white/10'
                    }`}
                  />
                  {questionType === 'multi' && options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-red-400/10 text-red-400/50 hover:text-red-400 hover:bg-red-400/20 flex items-center justify-center text-xs cursor-pointer transition-all"
                      title={t('removeOption')}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
            {questionType === 'multi' && options.length < 12 && (
              <button
                onClick={addOption}
                className="mt-3 w-full py-2 rounded-lg border border-dashed border-gold/20 text-gold/50 hover:text-gold hover:border-gold/40 text-sm cursor-pointer transition-all"
              >{t('addOption')}</button>
            )}
          </div>
        </>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={`w-full py-3 rounded-lg font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer pulse-glow ${
          mode === 'kp'
            ? 'bg-gradient-to-r from-purple-500/80 to-indigo-500/80 text-white hover:from-purple-500 hover:to-indigo-500'
            : 'bg-gradient-to-r from-gold/80 to-saffron/80 text-black hover:from-gold hover:to-saffron'
        }`}
      >
        {isLoading
          ? t('calculating')
          : mode === 'kp'
            ? (lang === 'mr' ? 'केपी विश्लेषण दाखवा' : 'Show KP Analysis')
            : t('showKundali')}
      </button>
    </div>
  );
}
