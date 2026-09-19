import { NextResponse } from 'next/server';
import { analyzeStudentCase } from '@/lib/redFlagDetector';
import { StudentProfile } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const profile: StudentProfile = await req.json();
    const analysis = analyzeStudentCase(profile);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Case analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze applicant dossier' }, { status: 500 });
  }
}