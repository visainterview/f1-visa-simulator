'use client';

import { StudentProfile } from '@/lib/types';
import { GraduationCap } from 'lucide-react';

interface Props {
  formData: Partial<StudentProfile>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<StudentProfile>>>;
}

export default function AcademicStep({ formData, setFormData }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
        <GraduationCap className="w-4 h-4" /> 2. Academic Background & U.S. Institution
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Latest Education in Nepal</label>
          <select
            value={formData.currentEducation || '+2 High School'}
            onChange={(e) => setFormData({ ...formData, currentEducation: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="+2 Science">+2 Science</option>
            <option value="+2 Management">+2 Management</option>
            <option value="Bachelor's Degree">Bachelor&apos;s Degree</option>
            <option value="A-Levels / IB">A-Levels / IB</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">GPA / Score in Nepal</label>
          <input
            type="text"
            value={formData.nepalGpa || ''}
            onChange={(e) => setFormData({ ...formData, nepalGpa: e.target.value })}
            placeholder="e.g. 3.45 or 78%"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Target U.S. University</label>
          <input
            type="text"
            required
            value={formData.targetUniversity || ''}
            onChange={(e) => setFormData({ ...formData, targetUniversity: e.target.value })}
            placeholder="e.g. University of Texas at Arlington"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Target Major / Program</label>
          <input
            type="text"
            required
            value={formData.major || ''}
            onChange={(e) => setFormData({ ...formData, major: e.target.value })}
            placeholder="e.g. Cyber Security / Computer Science"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">English Proficiency Test</label>
          <div className="flex gap-2">
            <select
              value={formData.testType || 'PTE'}
              onChange={(e) => setFormData({ ...formData, testType: e.target.value as any })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="PTE">PTE</option>
              <option value="IELTS">IELTS</option>
              <option value="Duolingo">Duolingo</option>
              <option value="SAT">SAT</option>
              <option value="None">None</option>
            </select>
            <input
              type="text"
              value={formData.testScore || ''}
              onChange={(e) => setFormData({ ...formData, testScore: e.target.value })}
              placeholder="Score (e.g. 66 / 7.0)"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Study Gap (Years)</label>
          <input
            type="number"
            min="0"
            max="15"
            value={formData.gapYears ?? 0}
            onChange={(e) => setFormData({ ...formData, gapYears: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}