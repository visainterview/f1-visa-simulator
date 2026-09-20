import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    const netCost = profile.hasI20
      ? `$${Number(profile.netI20PayableUSD || 28000).toLocaleString()}/year`
      : 'estimated budget';
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    const systemInstruction = `You are a real, strict U.S. Consular Officer at Window #03, U.S. Embassy Kathmandu conducting an in-person F-1 visa interview under INA Section 214(b).
APPLICANT: ${profile.fullName}, ${profile.age}y from ${profile.address}. 
Uni: ${profile.targetUniversity} (${profile.major}). 
Net Cost: ${netCost}. Family Income: NPR ${incomeLakhs} Lakhs/yr. 
Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation}). 
Sibling in US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'US resident'})` : 'NO'}.
Turn: ${voTurns + 1}

CRITICAL SPEECH RULES:
1. Speak directly to the applicant in 1 or 2 complete, well-formed, natural sentences.
2. NEVER output labels like "Draft Response:", "Notes:", or asterisks. Speak only the spoken words.
3. Cross-examine what they just said: challenge vague phrases, sibling in the US, or lack of bank statements.
4. If approving, include "visa is approved". If refusing, include "refused under Section 214(b)".`;

    // Format chat history for Gemini API
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

    let reply = '';

    // Primary: Gemini Flash with failover to avoid 503 high demand errors
    if (geminiKey) {
      const modelsToAttempt = ['gemini-3.6-flash', 'gemini-2.5-flash-lite'];

      for (const m of modelsToAttempt) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents,
                generationConfig: {
                  temperature: 0.5,
                  maxOutputTokens: 250, // Enough room so it never cuts off mid-sentence
                },
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (text) {
              reply = text;
              break;
            }
          }
        } catch (_) {}
      }
    }

    // Secondary Failover: Groq (if Google has a temporary server spike)
    if (!reply && groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages: [
              { role: 'system', content: systemInstruction },
              ...conversationHistory.slice(-4).map((m: any) => ({
                role: m.sender === 'vo' ? 'assistant' : 'user',
                content: m.text,
              })),
              { role: 'user', content: rawAnswer },
            ],
            temperature: 0.4,
            max_tokens: 180,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          reply = groqData.choices?.[0]?.message?.content?.trim() || '';
        }
      } catch (_) {}
    }

    // Clean any markdown formatting artifacts like "Draft Response**:" or notes
    reply = reply
      .replace(/^(\*+\s*)?(draft response|response|adjudication)(\*+)?:\s*/i, '')
      .replace(/^\([^)]*\)\s*/, '')
      .replace(/[*_#`]/g, '')
      .trim();

    if (!reply) {
      // Natural contextual fallback if both cloud APIs have a momentary network spike
      const lower = rawAnswer.toLowerCase();
      if (lower.includes('lab') || lower.includes('course')) {
        reply = `What specific professors or research facilities at ${profile.targetUniversity} convinced you to apply?`;
      } else if (profile.hasSiblingInUS && voTurns <= 2) {
        reply = `Your sibling is already living in the United States. Why should I believe you intend to return to Nepal?`;
      } else {
        reply = `If your father earns NPR ${incomeLakhs} Lakhs, what exact liquid bank balance can you present today?`;
      }
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
      reply: 'Please state clearly how you plan to finance your four years of study.',
      isConcluded: false,
    });
  }
}