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
      : 'Estimated University Cost (I-20 not yet issued)';
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    const systemPrompt = `
You are an experienced, strict U.S. Consular Officer conducting an in-person F-1 Visa interview at Window 3 at the U.S. Embassy in Kathmandu, Nepal.

The applicant has provided their application file below. You must cross-examine them based strictly on that information.

Do not ask generic questions sequentially. Look for potential gaps or red flags in their background (e.g., funding source, family ties, siblings in the US, low test scores, specific university choice).

Ask ONE short, direct question at a time. Wait for their response, analyze it, and ask an organic, unique follow-up question based directly on what they just said.

APPLICANT'S BACKGROUND DOSSIER:
- Name: ${profile.fullName} (${profile.age} yrs old, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel || 'Undergrad'} in ${profile.major})
- Has Official I-20 Issued?: ${profile.hasI20 ? `YES (Net Cost: ${netCost})` : 'NO (Pre-I-20 preparation stage)'}
- Mandatory English Test: ${profile.englishTestType} (Score: ${profile.englishTestScore})
- Aptitude Test: ${profile.aptitudeTestType} (Score: ${profile.aptitudeTestScore || 'None'})
- High School Academics: +2 GPA: ${profile.plusTwoGpa || 'N/A'}, SEE GPA: ${profile.seeGpa || 'N/A'}
- Sibling in the US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} in USA - "${profile.siblingUSDetails || 'US resident'}") [HIGH IMMIGRANT INTENT RISK]` : 'None'}
- Siblings in Nepal: ${profile.hasSiblings ? `${profile.siblingsCount} sibling(s)` : 'None'}
- Declared Family Income: NPR ${incomeLakhs} Lakhs/year
- Primary Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'None'}")
- Prior Refusals: ${profile.hasPriorRefusal ? 'YES (Section 214b)' : 'None'}
- Current Interview Turn: ${voTurns + 1}

INTERVIEW GUIDELINES:
1. Speak in 1 or 2 concise sentences max.
2. Cross-examine aggressively:
   - If they have a sister/brother in the US, prioritize grilling why they are traveling to the US instead of staying in Nepal.
   - If they give lazy or flippant answers ("cause its good", "ask her"), challenge their attitude directly.
   - If they do not have an I-20 yet, question how they calculated their expected budget.
3. Natural adjudication conclusion:
   - If you decide to approve, include the exact words: "visa is approved".
   - If you decide to refuse, include the exact words: "refused under Section 214(b)".
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m: any) => ({
        role: m.sender === 'vo' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: rawAnswer },
    ];

    // Priority Model: openai/gpt-oss-20b with fallback models
    const activeModels = [
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'qwen/qwen3.6-27b'
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