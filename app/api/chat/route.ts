import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json({
        reply: `[SYSTEM ERROR]: GROQ_API_KEY is not detected in Vercel Environment Variables.`,
        isConcluded: false,
      });
    }

    const netCost = profile.hasI20
      ? `$${Number(profile.netI20PayableUSD || 28000).toLocaleString()}/year`
      : 'Estimated Cost (Pre-I-20 stage)';
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    const systemPrompt = `
You are a real, strict, experienced U.S. Consular Officer conducting an official in-person F-1 Student Visa interview at Window #03 at the U.S. Embassy in Kathmandu, Nepal.

You think, converse, and cross-examine like an authentic American diplomat. You do NOT follow a robotic checklist.

APPLICANT'S RECORD:
- Name: ${profile.fullName} (${profile.age} yrs, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel || 'Undergrad'} in ${profile.major})
- Has Official I-20?: ${profile.hasI20 ? `YES (Net Cost: ${netCost})` : 'NO (Pre-I-20 practice stage)'}
- Mandatory English: ${profile.englishTestType} (Score: ${profile.englishTestScore})
- Aptitude: ${profile.aptitudeTestType} (${profile.aptitudeTestScore || 'None'})
- High School: +2 GPA: ${profile.plusTwoGpa || 'N/A'}, SEE GPA: ${profile.seeGpa || 'N/A'}
- Sibling in the US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} in USA - "${profile.siblingUSDetails || 'US resident'}") [CRITICAL CHAIN MIGRATION RISK]` : 'None'}
- Declared Income: NPR ${incomeLakhs} Lakhs/year
- Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'None'}")
- Prior Refusals: ${profile.hasPriorRefusal ? 'YES (Section 214b on record)' : 'None'}
- Current Question Turn: ${voTurns + 1}

INTERVIEW GUIDELINES:
1. Speak in 1 to 2 complete, well-formed, natural sentences. Never cut off in the middle.
2. Cross-examine aggressively based on what the student says:
   - If they have a sibling in the US, grill why they are traveling to the US instead of staying in Nepal with their parents.
   - If they cannot produce bank records or financial proof, question how the consulate can verify funds.
   - If they give flippant or 1-word answers, challenge their seriousness.
3. ADJUDICATION:
   - If you decide to approve, include the exact phrase: "visa is approved".
   - If you decide to refuse, include the exact phrase: "refused under Section 214(b)".
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m: any) => ({
        role: m.sender === 'vo' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: rawAnswer },
    ];

    // Verified working Groq models
    const activeModels = [
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'llama-3.1-8b-instant'
    ];

    let reply = '';
    let lastError = '';

    for (const model of activeModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.5,
            max_tokens: 400, // Ample tokens to ensure sentences complete naturally
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
      } catch (err: any) {
        lastError = err.message;
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