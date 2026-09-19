'use client';

import { StudentProfile } from '@/lib/types';
import { DollarSign } from 'lucide-react';

interface Props {
  formData: Partial<StudentProfile>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<StudentProfile>>>;
}

export default function FinancialStep({ formData, setFormData }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
        <DollarSign className="w-4 h-4" /> 3. Financial & Sponsorship Profile (Nepal Context)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Total Annual I-20 Cost (USD $)</label>
          <input
            type="number"
            required
            value={formData.i20CostUSD || 32000}
            onChange={(e) => setFormData({ ...formData, i20CostUSD: parseInt(e.target.value) || 0 })}
            placeholder="e.g. 32000"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Primary Financial Sponsor</label>
          <select
            value={formData.primarySponsor || 'Father'}
            onChange={(e) => setFormData({ ...formData, primarySponsor: e.target.value as any })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Both Parents">Both Parents</option>
            <option value="Relative">Uncle / Blood Relative</option>
            <option value="Bank Loan">Education Bank Loan</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Annual Family Income in Nepal (NPR)
          </label>
          <input
            type="number"
            step="100000"
            required
            value={formData.annualFamilyIncomeNPR || 2400000}
            onChange={(e) => setFormData({ ...formData, annualFamilyIncomeNPR: parseInt(e.target.value) || 0 })}
            placeholder="e.g. 2400000 for 24 Lakhs"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Sponsor Occupation / Income Source</label>
          <input
            type="text"
            required
            value={formData.sponsorOccupation || ''}
            onChange={(e) => setFormData({ ...formData, sponsorOccupation: e.target.value })}
            placeholder="e.g. Agro-business & commercial property rent"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}