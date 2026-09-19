import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return NextResponse.json({
        reply: `[SYSTEM ERROR]: GEMINI_API_KEY is not detected in Vercel Environment Variables.`,
        isConcluded: false,
      });
    }

    const netCost = profile.hasI20
      ? `$${Number(profile.netI20PayableUSD || 28000).toLocaleString()}/year`
      : 'Estimated Cost (Pre-I-20 stage)';
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    // 100% Organic Consular Cross-Examination Directive
    const systemInstruction = `
You are a real, strict U.S. Consular Officer conducting an authentic in-person F-1 student visa interview at Window #03 at the U.S. Embassy in Kathmandu, Nepal.
You have 60 seconds to cross-examine and adjudicate this applicant under Section 214(b) of the INA.

APPLICANT'S DOSSIER:
- Name: ${profile.fullName} (${profile.age} yrs, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel || 'Undergrad'} in ${profile.major})
- Has Official I-20?: ${profile.hasI20 ? `YES (Net Tuition: ${netCost})` : 'NO (Pre-I-20 stage)'}
- English Test: ${profile.englishTestType} (Score: ${profile.englishTestScore})
- Aptitude Test: ${profile.aptitudeTestType} (${profile.aptitudeTestScore || 'None'})
- High School: +2 GPA: ${profile.plusTwoGpa || 'N/A'}, SEE GPA: ${profile.seeGpa || 'N/A'}
- Sibling in US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} in USA - "${profile.siblingUSDetails || 'In USA'}") [HIGH IMMIGRANT INTENT FLAG]` : 'None'}
- Declared Income: NPR ${incomeLakhs} Lakhs/year
- Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'None'}")
- Prior Refusal: ${profile.hasPriorRefusal ? 'YES (Section 214b on record)' : 'None'}
- Current Interview Turn: ${voTurns + 1}

MANDATORY RULES:
1. Generate 100% of your own questions organically. Do NOT follow any standard list.
2. Ask exactly ONE short, skeptical, direct question at a time (under 18 words).
3. Directly cross-examine what the applicant just said:
   - If they have a sibling in the US, drill why they are traveling to the US instead of staying in Nepal.
   - If they give vague or nonchalant answers ("cause its good", "ask her"), challenge their attitude directly.
   - If their family income cannot sustain ${netCost}, demand proof of liquid bank funds.
4. ADJUDICATION VERDICT:
   - If you decide to approve, include the exact phrase: "visa is approved".
   - If you decide to refuse, include the exact phrase: "refused under Section 214(b)".
`;

    // Format conversation history for Gemini API
    const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

    for (const msg of conversationHistory) {
      if (contents.length === 0 && msg.sender === 'vo') {
        contents.push({
          role: 'user',
          parts: [{ text: '[Candidate approaches counter]' }],
        });
      }
      contents.push({
        role: msg.sender === 'vo' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: rawAnswer }],
    });

    // Gemini Flash Model Priority List
    const geminiModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];

    let reply = '';
    let lastError = '';

    for (const model of geminiModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents,
              generationConfig: {
                temperature: 0.65,
                maxOutputTokens: 80,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
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
        reply: `[GEMINI API ERROR]: ${lastError}`,
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