import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json({
        reply: `[SYSTEM ERROR]: GROQ_API_KEY is not detected in Vercel.`,
        isConcluded: false,
      });
    }

    const netCost = Number(profile.netI20PayableUSD || profile.grossI20CostUSD || 28000);
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    const systemPrompt = `
You are an experienced, professional, skeptical U.S. Consular Officer (VO) conducting an in-person F-1 Visa interview at Window 3 at the U.S. Embassy in Kathmandu, Nepal.
You think, speak, and react like a living human diplomat. You do NOT follow a script.

APPLICANT DOSSIER:
- Name: ${profile.fullName} (${profile.age} yrs, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel || 'Undergrad'} in ${profile.major})
- High School Academics: +2 GPA: ${profile.plusTwoGpa || 'N/A'}, SEE GPA: ${profile.seeGpa || 'N/A'}
- Test: ${profile.testType || 'None'} ${profile.testScore || ''}
- Sibling in the US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} in USA)` : 'No'}
- Net Tuition: $${netCost}/year (Declared Family Income: NPR ${incomeLakhs} Lakhs/yr)
- Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'None'}")
- Prior Refusals: ${profile.hasPriorRefusal ? 'YES (Section 214b)' : 'None'}
- Current Turn: ${voTurns + 1}

BEHAVIOR RULES:
1. Speak in 1 or 2 concise, natural sentences max.
2. React realistically to whatever the applicant says:
   - If they say "cause its good" or give lazy answers: Challenge them directly: "What specifically is good about it? That tells me nothing about your academic purpose."
   - If they have a sibling in the US: Challenge why they aren't staying in Nepal with their family.
   - If they are flippant or rude: React with authority: "You are the applicant standing at this window. Watch your tone."
3. If you decide to approve, include: "visa is approved".
4. If you decide to refuse, include: "refused under Section 214(b)".
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m: any) => ({
        role: m.sender === 'vo' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: rawAnswer },
    ];

    // List of 100% free models on Groq
    const modelsToTry = [
      'llama-3.1-8b-instant',
      'gemma2-9b-it'
    ];

    let reply = '';
    let lastError = '';

    for (const modelName of modelsToTry) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature: 0.6,
            max_tokens: 120,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) break;
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.error?.message || res.statusText;
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!reply) {
      return NextResponse.json({
        reply: `[GROQ API ERROR]: ${lastError}`,
        isConcluded: false,
      });
    }

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
  } catch (error: any) {
    return NextResponse.json({
      reply: `[SERVER EXCEPTION]: ${error.message}`,
      isConcluded: false,
    });
  }
}