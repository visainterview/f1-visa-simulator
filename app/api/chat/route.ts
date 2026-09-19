import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    const netCost = Number(profile.netI20PayableUSD || profile.grossI20CostUSD || 28000);
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();
    const lowerAnswer = rawAnswer.toLowerCase();

    // Turn Counter
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    // GIBBERISH / NONSENSE / TROLL DETECTION
    const isNonsenseOrTroll =
      lowerAnswer.includes('idi') ||
      lowerAnswer.includes('dik') ||
      lowerAnswer === 'by fun' ||
      lowerAnswer === 'for fun' ||
      lowerAnswer === 'i dont know' ||
      lowerAnswer === "i don't know" ||
      lowerAnswer === 'idk' ||
      lowerAnswer === 'dont know' ||
      lowerAnswer === 'whatever' ||
      rawAnswer.length < 2 ||
      /^([a-z])\1{2,}$/.test(lowerAnswer); // e.g. "aaaaa", "asdf"

    if (isNonsenseOrTroll) {
      return NextResponse.json({
        reply: `This is an official visa adjudication, not a game. Saying "${rawAnswer}" demonstrates a complete lack of genuine academic purpose. Your visa is refused under Section 214(b).`,
        isConcluded: true,
        verdict: 'REFUSED',
      });
    }

    // MANDATORY CONCLUSION: Finish in 4 turns
    if (voTurns >= 4) {
      const isWeak =
        profile.hasSiblingInUS ||
        netCost > Number(profile.annualFamilyIncomeNPR || 0) / 135 ||
        profile.hasPriorRefusal;

      if (isWeak) {
        return NextResponse.json({
          reply: `I have reviewed your answers and documents. You have failed to prove sufficient non-immigrant intent. I am refusing your visa under Section 214(b).`,
          isConcluded: true,
          verdict: 'REFUSED',
        });
      } else {
        return NextResponse.json({
          reply: `Your academic plans and family sponsorship appear verifiable. Place your passport in the tray; your visa is approved.`,
          isConcluded: true,
          verdict: 'APPROVED',
        });
      }
    }

    // Groq Dynamic AI Engine
    if (groqKey) {
      try {
        const systemPrompt = `
You are a sharp, skeptical U.S. Consular Officer (VO) at the U.S. Embassy in Kathmandu, Nepal conducting an F-1 Visa interview.
Strictly enforce Section 214(b) of the INA: Presume the applicant intends to overstay unless proven otherwise.

APPLICANT DOSSIER:
- Name: ${profile.fullName} (${profile.age} yrs, District: ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel} in ${profile.major})
- Sibling in the US: ${profile.hasSiblingInUS ? `YES (${profile.siblingUSStatus || 'US resident'} - ${profile.siblingUSDetails || 'In USA'})` : 'NO'}
- Siblings in Nepal: ${profile.hasSiblings ? `${profile.siblingsCount} siblings` : 'None (Only child)'}
- High School GPA: +2 GPA ${profile.plusTwoGpa || 'N/A'}, SEE GPA ${profile.seeGpa || 'N/A'}
- Test: ${profile.testType} ${profile.testScore}
- Net Payable Tuition: $${netCost}/year (Declared Family Income: NPR ${incomeLakhs} Lakhs/yr)
- Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'N/A'}")
- Turn: ${voTurns + 1} of 4

RULES:
1. Speak in 1 or 2 concise, sharp sentences max.
2. If they have a sibling in the US, aggressively question why they won't join them and overstay!
3. If they give evasive, flippant, or 1-word answers, refuse them immediately under 214(b).
4. At Turn 4, state: "Your visa is approved" OR "I am refusing your visa under Section 214(b)".
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
            temperature: 0.25,
            max_tokens: 110,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) {
            const isApproved = reply.toLowerCase().includes('approved');
            const isRefused = reply.toLowerCase().includes('214(b)') || reply.toLowerCase().includes('refusing');
            return NextResponse.json({
              reply,
              isConcluded: isApproved || isRefused,
              verdict: isApproved ? 'APPROVED' : isRefused ? 'REFUSED' : undefined,
            });
          }
        }
      } catch (e) {
        console.error('Groq call failed:', e);
      }
    }

    // Turn-Based Fallback Engine
    if (voTurns === 1) {
      if (profile.hasSiblingInUS) {
        return NextResponse.json({
          reply: `I see your sibling is already in the United States on ${profile.siblingUSStatus || 'visa'}. Why should I not consider you an immigration risk planning to join them?`,
          isConcluded: false,
        });
      }
      return NextResponse.json({
        reply: `Your net payable tuition is $${netCost}/year, but your declared family income is NPR ${incomeLakhs} Lakhs. What is your family's exact liquid bank source?`,
        isConcluded: false,
      });
    } else if (voTurns === 2) {
      return NextResponse.json({
        reply: `What specific academic modules in ${profile.major} will you study that will give you an advantage in Nepal?`,
        isConcluded: false,
      });
    } else if (voTurns === 3) {
      return NextResponse.json({
        reply: `What are your concrete career plans in Nepal right after graduation? Which specific companies in Kathmandu will hire you?`,
        isConcluded: false,
      });
    } else {
      return NextResponse.json({
        reply: `I have completed reviewing your application. You have failed to demonstrate strong economic ties to Nepal. Your visa is refused under Section 214(b).`,
        isConcluded: true,
        verdict: 'REFUSED',
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({
      reply: 'Please state clearly who is funding your education and their verifiable tax source.',
      isConcluded: false,
    });
  }
}