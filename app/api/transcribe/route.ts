import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const whisperData = new FormData();
    whisperData.append('file', file, 'audio.webm');
    whisperData.append('model', 'whisper-large-v3-turbo');
    whisperData.append('language', 'en');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
      },
      body: whisperData,
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Groq Whisper transcription error:', errBody);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const result = await res.json();
    return NextResponse.json({ text: result.text || '' });
  } catch (err) {
    console.error('Transcription exception:', err);
    return NextResponse.json({ error: 'Transcription exception' }, { status: 500 });
  }
}