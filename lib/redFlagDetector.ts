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
  const incomeNPR = Number(profile.annualFamilyIncomeNPR) || 0;
  const annualIncomeUSD = incomeNPR / 135;

  // 1. Mandatory English Test
  const scoreNum = parseFloat(profile.englishTestScore || '0');
  if (profile.englishTestType === 'IELTS') {
    if (scoreNum < 5.5) {
      redFlags.push(`Critical Language Deficit (IELTS ${scoreNum}): Below 5.5. High risk of refusal for language barrier.`);
      suggestedQuestions.push(`Your IELTS score is only ${scoreNum}. How can you handle university-level coursework in English?`);
    } else if (scoreNum === 5.5) {
      redFlags.push(`Borderline English (IELTS 5.5): Sub-par qualification; officer will test spoken fluency.`);
    } else if (scoreNum >= 7.0) {
      greenFlags.push(`Strong English Mastery: IELTS score of ${scoreNum}.`);
    }
  } else if (profile.englishTestType === 'PTE') {
    if (scoreNum < 45) {
      redFlags.push(`Critical PTE Deficit (${scoreNum}): Below 45 threshold.`);
    } else if (scoreNum >= 65) {
      greenFlags.push(`High PTE Competence (${scoreNum}).`);
    }
  }

  // 2. I-20 Status & Finances
  if (!profile.hasI20) {
    greenFlags.push('Pre-I-20 Practice Mode: Simulating interview before formal SEVIS document issuance.');
    suggestedQuestions.push(`You have not received your official I-20 yet. What is your estimated annual budget for ${profile.targetUniversity}?`);
  } else {
    if (annualIncomeUSD < netCost) {
      redFlags.push(`Funding Discrepancy: Annual family income ($${Math.round(annualIncomeUSD).toLocaleString()}) is less than net I-20 payable ($${netCost.toLocaleString()}).`);
      suggestedQuestions.push(`Your remaining tuition is $${netCost}/year, but family income is NPR ${(incomeNPR / 100000).toFixed(1)} Lakhs. How will you fund all 4 years?`);
    } else {
      greenFlags.push('Solvent Sponsorship: Declared family income covers net university tuition.');
    }
  }

  // 3. Siblings
  if (profile.hasSiblingInUS) {
    redFlags.push(`Sibling in the US (${profile.siblingUSStatus || 'Resident'}): Elevated 214(b) chain-migration risk.`);
    suggestedQuestions.unshift(`Your sibling is currently in the United States on ${profile.siblingUSStatus || 'visa'}. Why should I believe you will return to Nepal?`);
  } else if (profile.hasSiblings && Number(profile.siblingsCount) > 0) {
    greenFlags.push(`Domestic Rootedness: ${profile.siblingsCount} sibling(s) reside in Nepal.`);
  }

  suggestedQuestions.push(`Why did you choose ${profile.targetUniversity} specifically, instead of pursuing ${profile.major} in Nepal?`);

  let riskLevel: AnalysisResult['riskLevel'] = 'LOW';
  if (redFlags.length === 1) riskLevel = 'MEDIUM';
  if (redFlags.length >= 2) riskLevel = 'HIGH';
  if (profile.hasSiblingInUS || redFlags.some((f) => f.includes('Critical') || f.includes('Discrepancy'))) {
    riskLevel = 'CRITICAL';
  }

  return { riskLevel, redFlags, greenFlags, suggestedQuestions };
}