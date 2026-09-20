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

    // Strict Consular Adjudicator Directive
    const systemInstruction = `You are a real, strict U.S. Consular Officer (VO) at Window #03 at the U.S. Embassy in Kathmandu conducting an in-person F-1 visa interview under INA Section 214(b).

APPLICANT: ${profile.fullName}, ${profile.age}y from ${profile.address}. 
Uni: ${profile.targetUniversity} (${profile.major}). 
Net Cost: ${netCost}. Declared Family Income: NPR ${incomeLakhs} Lakhs/yr. 
Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation}). 
Sibling in US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'US resident'})` : 'NO'}.
Turn: ${voTurns + 1}

CRITICAL RULES:
1. Speak in exactly ONE or TWO complete, grammatical sentences.
2. YOU MUST ALWAYS FINISH YOUR SENTENCE completely with a period (.) or question mark (?).
3. NEVER end on prepositions or incomplete fragments like "applies to" or "Beyond".
4. If the applicant speaks broken English or another language, firmly demand: "Please speak clearly in English."
5. Challenge their university choice, lack of research, or sibling in the US.
6. If approving, include "visa is approved". If refusing, include "refused under Section 214(b)".`;

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

    // Primary: Google Gemini 3.6 Flash (Fast Single-Hop Call)
    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents,
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 300, // Ample token window prevents mid-sentence cut-offs
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        }
      } catch (_) {}
    }

    // Secondary Failover: Groq
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
              ...conversationHistory.slice(-3).map((m: any) => ({
                role: m.sender === 'vo' ? 'assistant' : 'user',
                content: m.text,
              })),
              { role: 'user', content: rawAnswer },
            ],
            temperature: 0.4,
            max_tokens: 200,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          reply = groqData.choices?.[0]?.message?.content?.trim() || '';
        }
      } catch (_) {}
    }

    // Clean formatting and remove trailing incomplete sentence fragments
    reply = reply
      .replace(/^(\*+\s*)?(draft response|response|adjudication)(\*+)?:\s*/i, '')
      .replace(/^\([^)]*\)\s*/, '')
      .replace(/[*_#`]/g, '')
      .trim();

    // Syntax Guard: If the model cuts off without ending punctuation, trim to the last complete sentence
    if (reply && !/[.?!]$/.test(reply)) {
      const lastPunctuation = Math.max(
        reply.lastIndexOf('.'),
        reply.lastIndexOf('?'),
        reply.lastIndexOf('!')
      );
      if (lastPunctuation > 20) {
        reply = reply.substring(0, lastPunctuation + 1).trim();
      } else {
        reply += '?';
      }
    }

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
      reply: 'Please state clearly how you plan to finance your four years of study.',
      isConcluded: false,
    });
  }
}