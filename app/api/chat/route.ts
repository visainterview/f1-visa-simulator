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

    // Strict 1-Sentence Rapid-Fire Consular Adjudicator Prompt
    const systemPrompt = `
You are a real, strict U.S. Consular Officer (VO) at Window #03 at the U.S. Embassy in Kathmandu, Nepal.
You have only 60 seconds to decide this case under Section 214(b).

STRICT BREVITY RULES:
1. You MUST ask only ONE single question per turn.
2. Keep your response under 18 words total. Never write long paragraphs.
3. Speak like an authentic, impatient, skeptical officer standing behind bulletproof glass.

APPLICANT'S RECORD:
- Name: ${profile.fullName} (${profile.age} yrs, District: ${profile.address})
- Target Uni: ${profile.targetUniversity} (${profile.major})
- Has Official I-20?: ${profile.hasI20 ? `YES (${netCost})` : 'NO (Pre-I-20)'}
- English: ${profile.englishTestType} ${profile.englishTestScore} | +2 GPA: ${profile.plusTwoGpa || 'N/A'}
- Sibling in US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} - "${profile.siblingUSDetails || 'In USA'}")` : 'NO'}
- Stated Income: NPR ${incomeLakhs} Lakhs/yr
- Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'None'}")
- Turn: ${voTurns + 1}

RAPID-FIRE DRILLING:
- If they have a sister/brother in the US, grill that: "Your sister is already in Texas. Why wouldn't you stay with her permanently?"
- If father earns only 28 Lakhs: "Your father earns 28 Lakhs. Where is the liquid bank balance for ${netCost}?"
- If they give vague answers ("its good", "yes"): Cut them off: "That tells me nothing. What specific lab or research attracts you?"
- If they are flippant or casual: "This is a formal visa adjudication. Watch your demeanor."

VERDICT:
- To approve: Include exact words: "visa is approved".
- To refuse: Include exact words: "refused under Section 214(b)".
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m: any) => ({
        role: m.sender === 'vo' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: rawAnswer },
    ];

    // ONLY OpenAI GPT-OSS models on Groq (NO LLAMA)
    const gptModels = [
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b'
    ];

    let reply = '';
    let lastError = '';

    for (const model of gptModels) {
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
            temperature: 0.35,
            max_tokens: 150, // Enough to finish the single sentence cleanly
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