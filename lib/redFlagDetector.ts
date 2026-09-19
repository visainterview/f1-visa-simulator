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

  // 1. MANDATORY ENGLISH TEST EVALUATION
  const scoreNum = parseFloat(profile.englishTestScore || '0');

  if (profile.englishTestType === 'IELTS') {
    if (scoreNum < 5.5) {
      redFlags.push(`Critical Language Deficit (IELTS ${scoreNum}): Score is below 5.5. High risk of refusal due to inability to pursue English-taught degree.`);
      suggestedQuestions.push(`Your IELTS score is only ${scoreNum}. How can you handle college lectures in English without remedial classes?`);
    } else if (scoreNum === 5.5) {
      redFlags.push(`Borderline English Proficiency (IELTS 5.5): Bare minimum qualification; consular officer will evaluate communication during interview.`);
      suggestedQuestions.push(`Your IELTS score is 5.5. Did your university require you to enroll in an intensive English bridge course?`);
    } else if (scoreNum >= 7.0) {
      greenFlags.push(`Strong Language Mastery: IELTS score of ${scoreNum} demonstrates strong communicative competence.`);
    } else {
      greenFlags.push(`Verified English Proficiency: IELTS score of ${scoreNum} meets standard university baseline.`);
    }
  } else if (profile.englishTestType === 'PTE') {
    if (scoreNum < 45) {
      redFlags.push(`Critical PTE Deficit (${scoreNum}): Below minimum consular threshold (45). High academic scrutiny.`);
      suggestedQuestions.push(`Your PTE score is ${scoreNum}. Why did you not retake the test to meet competitive admission standards?`);
    } else if (scoreNum < 54) {
      redFlags.push(`Moderate PTE Standing (${scoreNum}): Borderline score for undergraduate study.`);
    } else if (scoreNum >= 65) {
      greenFlags.push(`High PTE Competence (${scoreNum}): Comfortably above university admission criteria.`);
    } else {
      greenFlags.push(`Acceptable PTE Score (${scoreNum}).`);
    }
  } else if (profile.englishTestType === 'Duolingo') {
    if (scoreNum < 95) {
      redFlags.push(`Low Duolingo Score (${scoreNum}): Sub-100 DET scores are strictly scrutinized at the embassy window.`);
      suggestedQuestions.push(`Your Duolingo score is only ${scoreNum}. Can you explain why you chose an online test over IELTS or PTE?`);
    } else if (scoreNum < 105) {
      redFlags.push(`Borderline Duolingo Score (${scoreNum}).`);
    } else if (scoreNum >= 120) {
      greenFlags.push(`High Duolingo Score (${scoreNum}): Demonstrates advanced fluency.`);
    } else {
      greenFlags.push(`Standard Duolingo Score (${scoreNum}).`);
    }
  } else if (profile.englishTestType === 'TOEFL') {
    if (scoreNum < 60) {
      redFlags.push(`Low TOEFL Score (${scoreNum}): Below recommended consular threshold.`);
    } else if (scoreNum >= 85) {
      greenFlags.push(`Strong TOEFL Score (${scoreNum}).`);
    }
  }

  // 2. OPTIONAL APTITUDE TEST (SAT / GRE)
  if (profile.aptitudeTestType !== 'None' && profile.aptitudeTestScore) {
    const aptScore = parseInt(profile.aptitudeTestScore) || 0;
    if (profile.aptitudeTestType === 'SAT' && aptScore >= 1250) {
      greenFlags.push(`Scholastic Aptitude Distinction: SAT score of ${aptScore} demonstrates strong quantitative/verbal merit.`);
    } else if (profile.aptitudeTestType === 'GRE' && aptScore >= 310) {
      greenFlags.push(`Graduate Aptitude Distinction: GRE score of ${aptScore} confirms graduate readiness.`);
    }
  }

  // 3. SIBLINGS & CHAIN MIGRATION
  if (profile.hasSiblingInUS) {
    redFlags.push(`Sibling in the US (${profile.siblingUSStatus || 'Resident'}): High immigrant intent trigger under Section 214(b).`);
    suggestedQuestions.unshift(`I see your sibling is already in the United States on ${profile.siblingUSStatus || 'visa'}. What prevents you from joining them permanently?`);
  } else if (profile.hasSiblings && Number(profile.siblingsCount) > 0) {
    greenFlags.push(`Domestic Rootedness: ${profile.siblingsCount} sibling(s) reside in Nepal.`);
  }

  // 4. FINANCES & GAP
  if (annualIncomeUSD < netCost) {
    redFlags.push(`Funding Discrepancy: Annual family income ($${Math.round(annualIncomeUSD).toLocaleString()}) is lower than 1-year net payable cost ($${netCost.toLocaleString()}).`);
    suggestedQuestions.push(`Your payable tuition is $${netCost}/year, but family income is NPR ${(incomeNPR / 100000).toFixed(1)} Lakhs. How will you fund all 4 years?`);
  }

  suggestedQuestions.push(`Why did you choose ${profile.targetUniversity} specifically, instead of pursuing ${profile.major} here in Nepal?`);

  let riskLevel: AnalysisResult['riskLevel'] = 'LOW';
  if (redFlags.length === 1) riskLevel = 'MEDIUM';
  if (redFlags.length >= 2) riskLevel = 'HIGH';
  if (profile.hasSiblingInUS || redFlags.some((f) => f.includes('Critical') || f.includes('Deficit'))) {
    riskLevel = 'CRITICAL';
  }

  return { riskLevel, redFlags, greenFlags, suggestedQuestions };
}