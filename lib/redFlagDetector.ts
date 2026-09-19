import { StudentProfile } from './types';

export interface AnalysisResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  redFlags: string[];
  greenFlags: string[];
  suggestedQuestions: string[];
}

export function analyzeStudentCase(profile: StudentProfile): AnalysisResult {
  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  const suggestedQuestions: string[] = [];

  const netCost = Number(profile.netI20PayableUSD) || 0;
  const grossCost = Number(profile.grossI20CostUSD) || 0;
  const scholarship = Number(profile.scholarshipUSD) || 0;
  const incomeNPR = Number(profile.annualFamilyIncomeNPR) || 0;
  const annualIncomeUSD = incomeNPR / 135;

  // 1. SIBLING EVALUATION (High Section 214b Trigger for Nepal)
  if (profile.hasSiblingInUS) {
    redFlags.push(
      `Sibling in the United States (${profile.siblingUSStatus || 'Resident'}): Severe Section 214(b) Immigrant Intent trigger. Officer will presume chain-migration intent.`
    );
    suggestedQuestions.unshift(
      `Your sibling is already in the United States on ${profile.siblingUSStatus || 'visa'}. Why should I believe you won't join them permanently and overstay?`
    );
    suggestedQuestions.push(
      `Who funded your sibling's education in the US, and how can your family afford to fund both of you simultaneously?`
    );
  } else if (profile.hasSiblings && Number(profile.siblingsCount) > 0) {
    greenFlags.push(
      `Domestic Family Ties: ${profile.siblingsCount} sibling(s) reside in Nepal, maintaining domestic family rootedness.`
    );
  }

  // 2. Academics (+2 and SEE)
  const plusTwo = parseFloat(profile.plusTwoGpa || '0');
  const see = parseFloat(profile.seeGpa || '0');
  if (plusTwo >= 3.6 && see >= 3.6) {
    greenFlags.push(`Scholastic Merit: High school GPA ${plusTwo} (+2) & ${see} (SEE). Proven academic intent.`);
  } else if (plusTwo > 0 && plusTwo < 2.8) {
    redFlags.push(`Academic Risk: Low high school GPA (${plusTwo}). Consular officer will question academic viability.`);
    suggestedQuestions.push(`Your GPA in Nepal was only ${plusTwo}. How can you handle a challenging university curriculum in the US?`);
  }

  // 3. Language Test Proof
  if (profile.testType === 'None') {
    redFlags.push('Language Competence Unverified: No IELTS/PTE/SAT score declared.');
    suggestedQuestions.push('Why did you not appear for standard IELTS or PTE tests before applying to a US institution?');
  } else {
    greenFlags.push(`Language Proficiency: Standardized test declared (${profile.testType}: ${profile.testScore}).`);
  }

  // 4. Designation Seniority
  const title = (profile.sponsorSubDetails || '').toLowerCase();
  const highRanks = ['director', 'ceo', 'founder', 'joint secretary', 'gazetted', 'manager', 'doctor', 'professor', 'executive', 'landowner'];
  const lowRanks = ['assistant', 'helper', 'clerk', 'junior', 'peon', 'worker', 'staff', 'trainee', 'driver', 'cashier'];

  if (highRanks.some((r) => title.includes(r))) {
    greenFlags.push(`Executive Designation: Sponsor holds verified senior title ("${profile.sponsorSubDetails}").`);
  } else if (lowRanks.some((r) => title.includes(r))) {
    redFlags.push(`Low Income Designation: Sponsor is entry-level/assistant ("${profile.sponsorSubDetails}"). High risk for sustaining multi-year tuition.`);
    suggestedQuestions.push(`Your sponsor is an assistant. How can an entry-level position sustain $${netCost * 4} over 4 years?`);
  }

  // 5. Financial Ratio
  if (annualIncomeUSD < netCost) {
    redFlags.push(`Financial Deficit: Declared family income ($${Math.round(annualIncomeUSD).toLocaleString()}) is less than 1 year net tuition ($${netCost.toLocaleString()}).`);
    suggestedQuestions.push(`Your tuition is $${netCost}/year, but family income is only NPR ${(incomeNPR / 100000).toFixed(1)} Lakhs. How will you pay for 4 full years?`);
  } else if (annualIncomeUSD >= netCost * 1.5) {
    greenFlags.push(`Solvent Sponsorship: Annual family income covers net university tuition.`);
  }

  // Mandatory Section 214(b) Questions
  suggestedQuestions.push(`Why ${profile.targetUniversity} over institutions in Nepal or India that offer ${profile.major} at a fraction of the cost?`);
  suggestedQuestions.push(`What exact role in Nepal will you return to, and what monthly salary do you expect in Kathmandu?`);

  if (profile.hasPriorRefusal) {
    redFlags.push('Prior Refusal 214(b) on record. Must demonstrate substantial change in circumstances.');
    suggestedQuestions.unshift('You were previously refused under Section 214(b). What material fact has changed since then?');
  }

  let riskLevel: AnalysisResult['riskLevel'] = 'LOW';
  if (redFlags.length === 1) riskLevel = 'MEDIUM';
  if (redFlags.length >= 2) riskLevel = 'HIGH';
  if (profile.hasSiblingInUS || redFlags.some((f) => f.includes('Deficit') || f.includes('Refusal'))) {
    riskLevel = 'CRITICAL';
  }

  return { riskLevel, redFlags, greenFlags, suggestedQuestions };
}