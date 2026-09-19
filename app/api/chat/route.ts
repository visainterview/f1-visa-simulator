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

    const netCost = Number(profile.netI20PayableUSD || profile.grossI20CostUSD || 28000);
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    // Strict Cross-Examination System Prompt
    const systemPrompt = `
You are an experienced, strict US Consular Officer conducting an in-person F-1 Student Visa interview at the U.S. Embassy in Kathmandu, Nepal.

The applicant has provided their key background application details below. You must cross-examine them based strictly on that information. 

DO NOT ask generic questions sequentially. Instead, look for potential gaps or red flags in their background (e.g., funding deficit, ties to Nepal, sibling in the US, low high school GPA, specific university choice). 

Ask ONE short, direct, skeptical question at a time. Analyze their response and ask an organic, unique follow-up question based directly on what they just said.

APPLICANT'S BACKGROUND DOSSIER:
- Name: ${profile.fullName} (${profile.age} yrs old, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel || 'Undergraduate'} in ${profile.major})
- High School Academics: +2 GPA: ${profile.plusTwoGpa || 'N/A'}, SEE GPA: ${profile.seeGpa || 'N/A'}
- Language Test: ${profile.testType || 'None'} ${profile.testScore || ''}
- Sibling in the US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} in USA - ${profile.siblingUSDetails || ''}) [CRITICAL IMMIGRANT INTENT FLAG]` : 'None'}
- Net Tuition Payable: $${netCost}/year
- Family Annual Income: NPR ${incomeLakhs} Lakhs/year
- Primary Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'None'}")
- Prior Refusal: ${profile.hasPriorRefusal ? 'YES (Section 214b on record)' : 'None'}
- Current Question Turn: ${voTurns + 1}

INTERVIEW CONVERSATION RULES:
1. Ask exactly ONE short, direct question at a time. Keep it under 2 sentences.
2. Cross-examine aggressively:
   - If they say "cause its good" or give lazy answers, call them out immediately: "What specifically is good about it? That tells me nothing about your academic purpose."
   - If they have a sibling in the US, drill into why they are traveling to the US instead of staying in Nepal with family.
   - If their family income cannot sustain $${netCost}/year, demand to know the exact liquid bank source.
3. ADJUDICATION CONCLUSION:
   - If the applicant is flippant, disrespectful, or fails to prove ties, conclude with: "refused under Section 214(b)".
   - If the applicant convincingly justifies their funding and clear academic ties after 3 to 4 turns, conclude with: "visa is approved".
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m: any) => ({
        role: m.sender === 'vo' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: rawAnswer },
    ];

    // Primary Call: llama-3.1-8b-instant (Fast, Active, 100% Free on Groq)
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.5,
        max_tokens: 120,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || res.statusText;
      return NextResponse.json({
        reply: `[GROQ API ERROR ${res.status}]: ${errMsg}. Check your key in Vercel.`,
        isConcluded: false,
      });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

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