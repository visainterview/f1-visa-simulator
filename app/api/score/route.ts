import { NextResponse } from 'next/server';
import { StudentProfile, ChatMessage, EvaluationResult } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory }: { profile: StudentProfile; conversationHistory: ChatMessage[] } =
      await req.json();

    const groqKey = process.env.GROQ_API_KEY;
    const historyText = conversationHistory.map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n');

    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are the Senior Consular Adjudicator. Respond with valid JSON evaluating this applicant under Section 214(b).',
            },
            {
              role: 'user',
              content: `Applicant: ${JSON.stringify(profile)}\nTranscript:\n${historyText}`,
            },
          ],
        }),
      });

      const data = await res.json();
      const parsed: EvaluationResult = JSON.parse(data.choices[0].message.content);
      return NextResponse.json(parsed);
    }

    // Default Fallback Scoring
    const studentWords = conversationHistory
      .filter((m) => m.sender === 'student')
      .map((m) => m.text.toLowerCase())
      .join(' ');

    let finScore = 75;
    let tiesScore = 70;
    let academicScore = 80;
    let confidenceScore = 80;

    if (profile.annualFamilyIncomeNPR / 135 < profile.i20CostUSD) finScore -= 35;
    if (profile.age < 18) tiesScore -= 10;
    if (!studentWords.includes('nepal') && !studentWords.includes('return')) tiesScore -= 30;

    const overall = Math.round((finScore + tiesScore + academicScore + confidenceScore) / 4);
    const verdict = overall >= 65 && finScore >= 50 && tiesScore >= 50 ? 'ISSUED' : 'REFUSED_214B';

    const fallbackResult: EvaluationResult = {
      verdict,
      overallScore: overall,
      financialScore: Math.max(0, finScore),
      academicIntentScore: academicScore,
      homeTiesScore: Math.max(0, tiesScore),
      confidenceScore,
      redFlagsTriggered: [],
      feedbackList: [
        finScore < 55 ? 'Family annual income does not match the multi-year I-20 cost.' : 'Finances acceptable.',
        tiesScore < 60 ? 'Failed to prove sufficient economic/career ties back to Nepal.' : 'Career goals sound viable.',
      ],
    };

    return NextResponse.json(fallbackResult);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to score' }, { status: 500 });
  }
}