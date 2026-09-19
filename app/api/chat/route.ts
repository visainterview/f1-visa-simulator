import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json({
        reply: `[SYSTEM ERROR]: GROQ_API_KEY is not detected on Vercel. Please add GROQ_API_KEY in Vercel Settings -> Environment Variables and redeploy.`,
        isConcluded: false,
      });
    }

    const netCost = Number(profile.netI20PayableUSD || profile.grossI20CostUSD || 28000);
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    const systemPrompt = `
You are a real, sharp, skeptical U.S. Consular Officer (VO) conducting an in-person F-1 Visa interview at Window 3 at the U.S. Embassy in Kathmandu, Nepal.

You think, converse, and react like a living human diplomat. You do NOT follow a script. You do NOT ask the same questions to every applicant.

APPLICANT FILE:
- Name: ${profile.fullName} (${profile.age} yrs, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel || 'Undergrad'} in ${profile.major})
- High School Academics: +2 GPA: ${profile.plusTwoGpa || 'N/A'}, SEE GPA: ${profile.seeGpa || 'N/A'}
- Test: ${profile.testType || 'None'} ${profile.testScore || ''}
- Sibling in the US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} in USA)` : 'No siblings in the US'}
- Siblings in Nepal: ${profile.hasSiblings ? `${profile.siblingsCount} siblings` : 'None'}
- Net Tuition: $${netCost}/year (Declared Family Income: NPR ${incomeLakhs} Lakhs/yr)
- Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'None'}")
- Prior Refusal: ${profile.hasPriorRefusal ? 'YES (Section 214b on record)' : 'None'}
- Current Interview Turn: ${voTurns + 1}

BEHAVIOR GUIDELINES:
1. Speak in 1 or 2 concise, natural sentences max.
2. React realistically to whatever the applicant says:
   - If they say "cause its good" or give lazy answers: Challenge them directly: "What specifically is good about it? That tells me nothing about your academic purpose."
   - If they have a sibling in the US: Probe why they aren't staying in Nepal with their parents.
   - If they are rude or nonchalant: React with human authority: "You are standing at my window asking for a visa. Watch your tone."
3. Dynamic decision:
   - Strong applicants: Approve in 3 to 4 turns.
   - Poor, evasive, or rude applicants: Refuse in 2 to 3 turns.
4. If you approve, you MUST include: "visa is approved".
5. If you refuse, you MUST include: "refused under Section 214(b)".
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

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || res.statusText;
      return NextResponse.json({
        reply: `[GROQ API ERROR ${res.status}]: ${errMsg}. Check your key in Vercel Environment Variables.`,
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