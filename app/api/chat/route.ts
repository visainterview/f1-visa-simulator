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

    // Strict Consular Officer Persona
    const systemInstruction = `You are a real, strict U.S. Consular Officer (VO) at Window #03 at the U.S. Embassy in Kathmandu, Nepal conducting an in-person F-1 visa interview under Section 214(b) of the INA.

APPLICANT'S RECORD:
- Name: ${profile.fullName} (${profile.age} yrs, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.major})
- Has Official I-20?: ${profile.hasI20 ? `YES (${netCost})` : 'NO (Pre-I-20 stage)'}
- English: ${profile.englishTestType} (Score: ${profile.englishTestScore})
- High School: +2 GPA: ${profile.plusTwoGpa || 'N/A'}, SEE GPA: ${profile.seeGpa || 'N/A'}
- Sibling in US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'Resident'} in USA)` : 'NO'}
- Stated Income: NPR ${incomeLakhs} Lakhs/year
- Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation})
- Turn: ${voTurns + 1}

CRITICAL SPEECH RULES:
1. Speak directly to the applicant in 1 to 2 complete, well-spoken, natural sentences.
2. NEVER output isolated single words (like "preparedness"), internal thoughts, or parenthetical labels (like "(Adjudication)").
3. If the applicant gives lazy answers ("its good", "wht?"): Call them out directly: "That tells me nothing. What specific curriculum or lab facilities justify this investment?"
4. If they have a sibling in the US: Drill why they are traveling to the US instead of staying in Nepal with their family.
5. If concluding:
   - To approve: Include the exact phrase "visa is approved".
   - To refuse: Include the exact phrase "refused under Section 214(b)".`;

    // Format chat history for Gemini API (Alternating user and model)
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

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 350, // High token limit prevents sentence truncation
          },
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || res.statusText;
      return NextResponse.json({
        reply: `[GEMINI API ERROR]: ${errMsg}`,
        isConcluded: false,
      });
    }

    const data = await res.json();
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Clean any stray parentheses or markdown artifacts
    reply = reply.replace(/^\([^)]*\)\s*/, '').trim();

    if (!reply) {
      reply = `What specific academic coursework at ${profile.targetUniversity} justifies this degree over studying in Nepal?`;
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
      reply: `[SERVER ERROR]: ${error.message}`,
      isConcluded: false,
    });
  }
}