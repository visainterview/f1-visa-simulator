import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    const netCost = profile.hasI20
      ? `$${Number(profile.netI20PayableUSD || 28000).toLocaleString()}`
      : 'estimated budget';
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    // Compact, token-efficient consular system prompt
    const systemPrompt = `You are a strict, skeptical US Consular Officer at Window 3, US Embassy Kathmandu. 
Adjudicating F-1 visa under INA 214(b). 
APPLICANT: ${profile.fullName}, ${profile.age}y. Uni: ${profile.targetUniversity} (${profile.major}). 
Net Tuition: ${netCost}/yr. Declared Family Income: NPR ${incomeLakhs} Lakhs/yr. 
Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation}). 
Sibling in US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'US'})` : 'NO'}.
RULES:
1. Ask exactly ONE short, skeptical question under 18 words.
2. Cross-examine gaps: father's liquid bank proof, sibling in the US, or university choice.
3. If they give vague or 2-word answers, challenge their lack of documentation.
4. If approved: include "visa is approved". If refused: include "refused under Section 214(b)".`;

    // Only send the last 4 messages to save 80% token quota
    const recentMessages = conversationHistory.slice(-4).map((m: any) => ({
      role: m.sender === 'vo' ? 'assistant' : 'user',
      content: m.text,
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
      { role: 'user', content: rawAnswer },
    ];

    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages,
            temperature: 0.35,
            max_tokens: 80,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) {
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
          }
        }
      } catch (_) {
        // Silently fall through to contextual consular failover without exposing API logs
      }
    }

    // Contextual Consular Failover (Never displays code errors to users)
    const lower = rawAnswer.toLowerCase();
    let fallbackReply = '';

    if (lower.includes('no') || lower.includes('idk') || lower.length < 4) {
      fallbackReply = `If you cannot produce verifiable financial documentation, how can this consulate confirm these funds exist?`;
    } else if (profile.hasSiblingInUS && voTurns <= 2) {
      fallbackReply = `Your sibling is already in the United States. What permanent career ties compel you to return to Nepal?`;
    } else if (voTurns >= 4) {
      return NextResponse.json({
        reply: `You have failed to provide adequate documentation or overcome the presumption of immigrant intent. Your visa is refused under Section 214(b).`,
        isConcluded: true,
        verdict: 'REFUSED',
      });
    } else {
      fallbackReply = `What specific career position in Nepal will you secure that justifies spending ${netCost} annually?`;
    }

    return NextResponse.json({
      reply: fallbackReply,
      isConcluded: false,
    });
  } catch (error: any) {
    return NextResponse.json({
      reply: 'Please state clearly how your family plans to liquidate funds for your university expenses.',
      isConcluded: false,
    });
  }
}