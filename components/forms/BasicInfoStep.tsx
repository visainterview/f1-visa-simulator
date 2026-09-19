'use client';

import { StudentProfile } from '@/lib/types';
import { ShieldAlert, User } from 'lucide-react';

interface Props {
  formData: Partial<StudentProfile>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<StudentProfile>>>;
  calculatedAge: number | null;
  onDobChange: (dob: string) => void;
}

export default function BasicInfoStep({ formData, setFormData, calculatedAge, onDobChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
        <User className="w-4 h-4" /> 1. Personal & Passport Identity
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Full Name (As on Passport)</label>
          <input
            type="text"
            required
            placeholder="e.g. Bipin Adhikari"
            value={formData.fullName || ''}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Date of Birth</label>
          <input
            type="date"
            required
            value={formData.dob || ''}
            onChange={(e) => onDobChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Permanent Residential Address</label>
          <input
            type="text"
            required
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g. Pokhara-08, Kaski, Nepal"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Country of Citizenship</label>
          <input
            type="text"
            disabled
            value="Nepal"
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-400 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
          />
        </div>
      </div>

      {/* Age Warning/Verification Banner */}
      {calculatedAge !== null && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition ${
            calculatedAge < 18
              ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
          }`}
        >
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">
              Applicant Age: {calculatedAge} years old ({calculatedAge < 18 ? 'Minor Applicant' : 'Adult'})
            </p>
            {calculatedAge < 18 ? (
              <p className="text-amber-300/80 leading-relaxed">
                Applicants under 18 must provide U.S. institutional housing consent and parental financial affidavits.
              </p>
            ) : (
              <p className="text-emerald-400/80">Standard adult DS-160 non-immigrant processing rules apply.</p>
            )}
          </div>
        </div>
      )}

      {/* Conditional Guardian Input for Minors */}
      {calculatedAge !== null && calculatedAge < 18 && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-3">
          <div className="text-xs font-semibold text-amber-400 uppercase">Parent / Legal Guardian in Nepal</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Guardian Full Name</label>
              <input
                type="text"
                placeholder="Parent's Name"
                value={formData.guardianName || ''}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Relationship</label>
              <input
                type="text"
                placeholder="Father / Mother"
                value={formData.guardianRelation || ''}
                onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}