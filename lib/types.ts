export type NepalOccupationCategory =
  | 'Government Officer (Gazetted / Civil Service)'
  | 'Registered Commercial Business / Import-Export'
  | 'Agriculture & Commercial Landowner'
  | 'Banking & Financial Sector Executive'
  | 'Medical Doctor / Senior Healthcare Specialist'
  | 'Chartered Accountant (CA) / Audit Firm'
  | 'Software Engineer / IT Professional'
  | 'University Professor / School Principal'
  | 'Foreign Employment / Remittance Dependent'
  | 'Civil Engineer / Construction Contractor'
  | 'Tourism / Trekking & Hotel Entrepreneur'
  | 'Retired with Government Pension & Rental Properties'
  | 'Unemployed / Informal Unregistered Income'
  | string;

export interface StudentProfile {
  fullName: string;
  dob: string;
  age: number;
  isMinor: boolean;
  isNearAdult?: boolean;
  address: string;
  country: string;

  // Siblings & Family Ties in Nepal / US
  hasSiblings: boolean;
  siblingsCount: number | '';
  hasSiblingInUS: boolean;
  siblingUSStatus?: 'F-1 Student' | 'OPT' | 'H-1B Worker' | 'Green Card / Citizen' | 'Other' | '';
  siblingUSDetails?: string;

  // Academics in Nepal
  seeGpa?: string;
  plusTwoGpa?: string;
  nepalGpa?: string;
  currentEducation?: string;
  testType?: 'IELTS' | 'PTE' | 'TOEFL' | 'Duolingo' | 'SAT' | 'GRE' | 'None' | string;
  testScore?: string;
  gapYears?: any;

  // Target US Study
  targetUniversity: string;
  degreeLevel?: string;
  major: string;

  // Financials
  grossI20CostUSD?: any;
  scholarshipUSD?: any;
  netI20PayableUSD?: any;

  // Sponsorship
  primarySponsor?: string;
  sponsorOccupation?: string;
  sponsorSubDetails?: string;
  annualFamilyIncomeNPR?: any;
  totalLiquidSavingsUSD?: any;

  // History
  hasPriorRefusal?: boolean;
  priorRefusalDetails?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'vo' | 'student';
  text: string;
  timestamp: string;
}

export interface EvaluationResult {
  verdict: 'ISSUED' | 'REFUSED_214B' | 'ADMINISTRATIVE_PROCESSING_221G' | string;
  overallScore: number;
  financialScore: number;
  academicIntentScore: number;
  homeTiesScore: number;
  confidenceScore: number;
  redFlagsTriggered?: string[];
  greenFlagsTriggered?: string[];
  feedbackList?: string[];
}