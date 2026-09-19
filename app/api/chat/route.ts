import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { profile, conversationHistory, latestStudentAnswer } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    const netCost = Number(profile.netI20PayableUSD || profile.grossI20CostUSD || 28000);
    const incomeLakhs = (Number(profile.annualFamilyIncomeNPR || 0) / 100000).toFixed(1);
    const rawAnswer = (latestStudentAnswer || '').trim();

    // Turn count
    const voTurns = conversationHistory.filter((m: any) => m.sender === 'vo').length;

    // Strict Consular Adjudicator Prompt
    const systemPrompt = `
You are a real, living, skeptical U.S. Consular Officer (VO) conducting an in-person F-1 Visa interview at Window #03 at the U.S. Embassy in Kathmandu, Nepal.

You are NOT an AI assistant. You do NOT follow a robotic checklist. You are an experienced American diplomat who adjudicates thousands of Nepali applicants every month under Section 214(b) of the Immigration and Nationality Act (every applicant is presumed to be an intending immigrant until they prove otherwise).

APPLICANT'S DECLARED DOSSIER:
- Full Name: ${profile.fullName} (${profile.age} years old, from ${profile.address})
- Target University: ${profile.targetUniversity} (${profile.degreeLevel || 'Undergrad'} in ${profile.major})
- High School / Nepal Grades: +2 GPA ${profile.plusTwoGpa || 'N/A'}, SEE GPA ${profile.seeGpa || 'N/A'}
- Language Test: ${profile.testType || 'None'} ${profile.testScore || ''}
- Sibling in the U.S.?: ${profile.hasSiblingInUS ? `YES! A sibling is currently in the US on ${profile.siblingUSStatus || 'visa'} (${profile.siblingUSDetails || 'US resident'}). THIS IS A MAJOR IMMIGRATION RISK.` : 'No, no siblings in the US.'}
- Other Siblings: ${profile.hasSiblings ? `${profile.siblingsCount} sibling(s) in Nepal` : 'Only child'}
- Net Tuition Payable: $${netCost}/year (Annual declared family income: NPR ${incomeLakhs} Lakhs)
- Primary Sponsor: ${profile.primarySponsor} (${profile.sponsorOccupation} - "${profile.sponsorSubDetails || 'Not specified'}")
- Prior Refusal: ${profile.hasPriorRefusal ? `YES, previously refused under 214(b) (${profile.priorRefusalDetails || 'on record'})` : 'No prior refusals'}
- Interview Turn: ${voTurns + 1}

HOW A REAL VISA OFFICER CONVERSES & THINKS:
1. Speak in 1 or 2 natural, punchy sentences max (embassy interviews are fast, under 90 seconds).
2. NEVER ask the same question twice, and do NOT use a scripted list. React dynamically to what the applicant JUST said:
   - If they give a nonchalant, lazy answer (e.g. "because i liked it", "idk", "fun"): Interrupt and grill them: "'Because you liked it'? That's not an academic reason. What specific faculty, lab, or coursework justifies this degree?"
   - If they are disrespectful or sassy (e.g. "ask her!!", "ask", "why are you asking"): React with real human authority: "Excuse me? You are standing at my window asking for a visa, not your sister. Lower your tone and answer my question, or step away from this counter."
   - If they have a sibling in the US: Grill why they are traveling to the US when their sibling is already there. Why not stay and support their parents in Nepal?
   - If their family income is NPR 15-25 Lakhs and tuition is $30,000+: Demand proof of liquid funds. How can they afford $120,000 over 4 years?
3. DYNAMIC CONCLUSION (You decide when the interview ends):
   - If the applicant is rude, insolent, or gives 2 consecutive lazy/unlettered answers: REFUSE THEM ON THE SPOT immediately: "I have heard enough. Your visa is refused under Section 214(b)."
   - If the applicant has a strong case (high GPA, good funds, no sibling risk, articulate answers): After 2 or 3 turns, approve them: "Your paperwork and academic intent are in order. Place your passport in the tray; your visa is approved."
   - If the applicant is borderline or suspicious: Push them for 4 turns, then make your final verdict (Approved or Refused 214b).

CRITICAL FORMATTING RULE:
- If you decide to end the interview with APPROVAL, your sentence MUST contain the exact words: "visa is approved".
- If you decide to REFUSE the applicant, your sentence MUST contain the exact words: "refused under Section 214(b)".
`;

    if (groqKey) {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map((m: any) => ({
          role: m.sender === 'vo' ? 'assistant' : 'user',
          content: m.text,
        })),
        { role: 'user', content: rawAnswer },
      ];

      // Primary attempt with Llama 3.3 70B
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.5, // Natural human variance & unpredictability
            max_tokens: 120,
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
      } catch (err) {
        console.error('Groq 70b failed, trying 8b fast fallback:', err);
      }

      // Fast fallback to Llama 3.1 8B if 70B had an issue
      try {
        const res8b = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages,
            temperature: 0.5,
            max_tokens: 100,
          }),
        });

        if (res8b.ok) {
          const data8b = await res8b.json();
          const reply8b = data8b.choices?.[0]?.message?.content?.trim();
          if (reply8b) {
            const isApproved = reply8b.toLowerCase().includes('approved');
            const isRefused =
              reply8b.toLowerCase().includes('214(b)') ||
              reply8b.toLowerCase().includes('refused') ||
              reply8b.toLowerCase().includes('refusing');

            return NextResponse.json({
              reply: reply8b,
              isConcluded: isApproved || isRefused,
              verdict: isApproved ? 'APPROVED' : isRefused ? 'REFUSED' : undefined,
            });
          }
        }
      } catch (err8b) {
        console.error('Groq 8b failed:', err8b);
      }
    }

    // Emergency dynamic response (if Groq key is completely missing)
    const lower = rawAnswer.toLowerCase();
    if (lower.includes('ask her') || lower.includes('ask') || lower.length < 3) {
      return NextResponse.json({
        reply: `Excuse me? You are applying for a visa, not someone else. Your flippant attitude proves you lack genuine intent. Your visa is refused under Section 214(b).`,
        isConcluded: true,
        verdict: 'REFUSED',
      });
    }

    if (voTurns >= 3) {
      return NextResponse.json({
        reply: `I have reviewed your case and responses. You have failed to prove sufficient ties to Nepal. Your visa is refused under Section 214(b).`,
        isConcluded: true,
        verdict: 'REFUSED',
      });
    }

    return NextResponse.json({
      reply: `What specific career position will you take up in Nepal immediately after graduation?`,
      isConcluded: false,
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return NextResponse.json({
      reply: 'Please state clearly how you plan to finance your four years of study.',
      isConcluded: false,
    });
  }
}