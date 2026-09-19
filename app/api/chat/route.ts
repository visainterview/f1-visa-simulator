import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();

    // Ensures Groq ALWAYS runs even if Vercel environment variables are missing
    const groqKey =
      process.env.GROQ_API_KEY || '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';

    const netCost = Number(profile.netI20PayableUSD || profile.grossI20CostUSD || 28000);
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();

    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    // Pure Human Consular System Prompt
    const systemPrompt = `
You are an experienced, professional, and skeptical U.S. Consular Officer (VO) conducting an in-person F-1 Visa interview at Window 3 at the U.S. Embassy in Kathmandu, Nepal.

You think, speak, and react like a living human diplomat. You do NOT follow a script. You do NOT ask the same questions to everyone.

APPLICANT FILE:
- Name: ${profile.fullName} (${profile.age} yrs, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel || 'Undergrad'} in ${profile.major})
- High School Academics: +2 GPA: ${profile.plusTwoGpa || 'N/A'}, SEE GPA: ${profile.seeGpa || 'N/A'}
- Test: ${profile.testType || 'None'} ${profile.testScore || ''}
- Sibling in the US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} in USA)` : 'No siblings in the US'}
- Siblings in Nepal: ${profile.hasSiblings ? `${profile.siblingsCount} siblings` : 'None'}
- Net Tuition Payable: $${netCost}/year (Declared Family Income: NPR ${incomeLakhs} Lakhs/yr)
- Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'None'}")
- Prior Refusals: ${profile.hasPriorRefusal ? 'YES (Section 214b)' : 'None'}
- Current Question Turn: ${voTurns + 1}

HOW TO CONVERSE LIKE A REAL HUMAN CONSULAR OFFICER:
1. Speak in 1 or 2 concise, natural sentences max.
2. React realistically to whatever the applicant says:
   - If they just greet you ("hi", "hello", "good morning"): Greet back formally like an officer: "Good morning. Please place your passport and I-20 on the counter. Why are you traveling to the United States?"
   - If they give a vague answer: Probe the exact detail.
   - If they are flippant, rude, or nonchalant: React with human authority: "You are the applicant standing at this window. Watch your tone."
   - If they have a sibling in the US: Challenge their intent to return to Nepal instead of staying with their sibling.
3. DECIDING WHEN TO END:
   - Strong applicants with good grades and clear funds: Approve in 3 to 4 turns.
   - Extremely poor, rude, or nonsensical applicants: Refuse in 2 to 3 turns.
   - Suspicious or borderline applicants: Push for 4 to 5 turns before deciding.

VERDICT KEYWORDS:
- When you decide to approve: You MUST include the exact phrase: "visa is approved".
- When you decide to refuse: You MUST include the exact phrase: "refused under Section 214(b)".
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m: any) => ({
        role: m.sender === 'vo' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: rawAnswer },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.6,
        max_tokens: 120,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (reply) {
        const isApproved = reply.toLowerCase().includes('approved');
        const isRefused =
          reply.toLowerCase().includes('214(b)') ||
          reply.toLowerCase().includes('refused') ||
          reply.toLowerCase().includes('refusing');

        return NextResponse.json({
          reply,
          isConcluded: isApproved || isRefused,
          verdict: isApproved ? 'APPROVED' : isRefused ? 'REFUSED' : undefined,
        });
      }
    }

    // Secondary fallback to Llama 3.1 8B if 70B is busy
    const res8b = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.6,
        max_tokens: 100,
      }),
    });

    if (res8b.ok) {
      const data8b = await res8b.json();
      const reply8b = data8b.choices?.[0]?.message?.content?.trim();
      if (reply8b) {
        const isApproved = reply8b.toLowerCase().includes('approved');
        const isRefused =
          reply8b.toLowerCase().includes('214(b)') ||
          reply8b.toLowerCase().includes('refused') ||
          reply8b.toLowerCase().includes('refusing');

        return NextResponse.json({
          reply: reply8b,
          isConcluded: isApproved || isRefused,
          verdict: isApproved ? 'APPROVED' : isRefused ? 'REFUSED' : undefined,
        });
      }
    }

    return NextResponse.json({
      reply: `Good morning. Pass me your passport and I-20. What is your primary purpose of travel to the United States?`,
      isConcluded: false,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({
      reply: 'Please state clearly why you chose this specific program in the United States.',
      isConcluded: false,
    });
  }
}