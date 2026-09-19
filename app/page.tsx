'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfile } from '@/lib/types';
import { US_UNIVERSITIES, MAJORS_LIST, NEPAL_OCCUPATIONS, NEPAL_DISTRICTS } from '@/lib/universityData';
import {
  ShieldAlert,
  ArrowRight,
  UserCheck,
  DollarSign,
  GraduationCap,
  AlertOctagon,
  Calculator,
  Search,
  Building2,
  FileCheck,
  Users
} from 'lucide-react';

export default function StudentFormPage() {
  const router = useRouter();

  // Personal
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [district, setDistrict] = useState('');

  // Siblings & Family Ties
  const [hasSiblings, setHasSiblings] = useState(false);
  const [siblingsCount, setSiblingsCount] = useState('');
  const [hasSiblingInUS, setHasSiblingInUS] = useState(false);
  const [siblingUSStatus, setSiblingUSStatus] = useState<any>('');
  const [siblingUSDetails, setSiblingUSDetails] = useState('');

  // Academics in Nepal
  const [seeGpa, setSeeGpa] = useState('');
  const [plusTwoGpa, setPlusTwoGpa] = useState('');
  const [testType, setTestType] = useState<any>('PTE');
  const [testScore, setTestScore] = useState('');
  const [gapYears, setGapYears] = useState('');

  // Target US Study
  const [targetUni, setTargetUni] = useState('');
  const [major, setMajor] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('');

  // Finances
  const [grossI20, setGrossI20] = useState('');
  const [scholarship, setScholarship] = useState('');
  const [primarySponsor, setPrimarySponsor] = useState('Father');
  const [sponsorOccupation, setSponsorOccupation] = useState('');
  const [sponsorSubDetails, setSponsorSubDetails] = useState('');
  const [annualIncomeNPR, setAnnualIncomeNPR] = useState('');

  // Prior Refusal
  const [hasPriorRefusal, setHasPriorRefusal] = useState(false);
  const [priorRefusalDetails, setPriorRefusalDetails] = useState('');

  // Dropdown states
  const [filteredUnis, setFilteredUnis] = useState<string[]>([]);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [filteredMajors, setFilteredMajors] = useState<string[]>([]);
  const [showMajorDropdown, setShowMajorDropdown] = useState(false);

  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  const uniRef = useRef<HTMLDivElement>(null);
  const majorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (uniRef.current && !uniRef.current.contains(event.target as Node)) {
        setShowUniDropdown(false);
      }
      if (majorRef.current && !majorRef.current.contains(event.target as Node)) {
        setShowMajorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUniChange = (val: string) => {
    setTargetUni(val);
    if (val.trim().length > 0) {
      const matches = US_UNIVERSITIES.filter((u) => u.toLowerCase().includes(val.toLowerCase()));
      setFilteredUnis(matches);
      setShowUniDropdown(true);
    } else {
      setShowUniDropdown(false);
    }
  };

  const handleMajorChange = (val: string) => {
    setMajor(val);
    if (val.trim().length > 0) {
      const matches = MAJORS_LIST.filter((m) => m.toLowerCase().includes(val.toLowerCase()));
      setFilteredMajors(matches);
      setShowMajorDropdown(true);
    } else {
      setShowMajorDropdown(false);
    }
  };

  const handleDobChange = (dateVal: string) => {
    setDob(dateVal);
    if (!dateVal) {
      setCalculatedAge(null);
      return;
    }
    const birthDate = new Date(dateVal);
    const today = new Date();
    const ageDiff = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    setCalculatedAge(Math.round(ageDiff * 10) / 10);
  };

  const grossNum = Number(grossI20) || 0;
  const scholarshipNum = Number(scholarship) || 0;
  const netPayableUSD = Math.max(0, grossNum - scholarshipNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !dob) {
      alert('Please enter your full legal name and date of birth.');
      return;
    }
    if (!district) {
      alert('Please select your citizenship district in Nepal.');
      return;
    }
    if (!targetUni.trim() || !major.trim() || !degreeLevel) {
      alert('Please select your target U.S. university, degree level, and major.');
      return;
    }
    if (!plusTwoGpa || !seeGpa) {
      alert('Please enter your Class 10 (SEE) and Class 12 (+2) GPAs.');
      return;
    }
    if (!sponsorOccupation) {
      alert('Please select your sponsor’s official occupation category.');
      return;
    }
    if (!grossI20) {
      alert('Please enter your total annual Gross I-20 cost.');
      return;
    }
    if (!annualIncomeNPR) {
      alert('Please enter your family annual income in NPR.');
      return;
    }

    const age = calculatedAge ?? 20;

    const profileData: StudentProfile = {
      fullName: fullName.trim(),
      dob,
      age,
      isMinor: age < 17.5,
      isNearAdult: age >= 17.5 && age < 18,
      address: `${district}, Nepal`,
      country: 'Nepal',
      hasSiblings,
      siblingsCount: hasSiblings ? Number(siblingsCount) || 1 : 0,
      hasSiblingInUS,
      siblingUSStatus: hasSiblingInUS ? siblingUSStatus : '',
      siblingUSDetails: hasSiblingInUS ? siblingUSDetails.trim() : '',
      seeGpa: seeGpa.trim(),
      plusTwoGpa: plusTwoGpa.trim(),
      currentEducation: '+2 High School',
      testType,
      testScore: testScore.trim() || 'N/A',
      gapYears: gapYears === '' ? 0 : Number(gapYears),
      targetUniversity: targetUni.trim(),
      degreeLevel,
      major: major.trim(),
      grossI20CostUSD: grossNum,
      scholarshipUSD: scholarshipNum,
      netI20PayableUSD: netPayableUSD,
      primarySponsor,
      sponsorOccupation,
      sponsorSubDetails: sponsorSubDetails.trim(),
      annualFamilyIncomeNPR: Number(annualIncomeNPR) || 0,
      totalLiquidSavingsUSD: 0,
      hasPriorRefusal,
      priorRefusalDetails: priorRefusalDetails.trim(),
    };

    localStorage.setItem('f1_applicant_profile', JSON.stringify(profileData));
    router.push('/vo-panel');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 flex justify-center items-center">
      <div className="max-w-3xl w-full bg-slate-900/95 border border-slate-800/80 rounded-2xl p-6 md:p-9 shadow-2xl backdrop-blur-xl space-y-6">
        
        {/* 2026 Directive */}
        <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-xl flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-rose-200 uppercase tracking-wide">
              Official 2026 Embassy Directive • Section 214(b) Presumption Notice
            </div>
            <p className="text-rose-300/80 leading-relaxed">
              Nepal F-1 refusal rates currently exceed <strong>81%</strong>. Under U.S. Law (INA 214b), the Consular Officer is legally mandated to <strong>presume you intend to overstay and settle in the U.S.</strong> The initial adjudicative stance is <strong>REJECTION</strong>. Nonsense, generic, or flippant answers will result in immediate refusal.
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="border-b border-slate-800/80 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">F-1 Visa Case Intake Dossier</h1>
            <p className="text-xs text-slate-400">Information must strictly match your DS-160 and SEVIS paperwork.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Personal Identity */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <span>1.</span> Personal Identity & Citizenship
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name (Passport)</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full passport name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">District (Citizenship of Nepal)</label>
                <select
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Select your citizenship district in Nepal...</option>
                  {NEPAL_DISTRICTS.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {calculatedAge !== null && (
              <div
                className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  calculatedAge < 17.5
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : calculatedAge < 18
                    ? 'bg-blue-950/30 border-blue-800/60 text-blue-200'
                    : 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
                }`}
              >
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    Calculated Age: {calculatedAge} years old —{' '}
                    {calculatedAge < 17.5
                      ? 'Minor Status (< 17.5 yrs)'
                      : calculatedAge < 18
                      ? 'Near-Adult Status (17.5+ yrs)'
                      : 'Adult Candidate (18+ yrs)'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Siblings & Family Ties in Nepal / US */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-4">
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase flex items-center gap-2">
              <Users className="w-4 h-4" /> 2. Siblings & U.S. Family Ties
            </h2>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={hasSiblings}
                  onChange={(e) => setHasSiblings(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
                />
                <span>I have siblings (brother or sister)</span>
              </label>

              {hasSiblings && (
                <div className="pl-6 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Total Number of Siblings</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1 or 2"
                      value={siblingsCount}
                      onChange={(e) => setSiblingsCount(e.target.value)}
                      className="w-40 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Sibling in US check */}
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-rose-300">
                      <input
                        type="checkbox"
                        checked={hasSiblingInUS}
                        onChange={(e) => setHasSiblingInUS(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-rose-700"
                      />
                      <span>⚠️ A sibling is currently living, studying, or working in the United States</span>
                    </label>

                    {hasSiblingInUS && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Sibling's U.S. Legal Status</label>
                          <select
                            value={siblingUSStatus}
                            onChange={(e) => setSiblingUSStatus(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                          >
                            <option value="">Select status...</option>
                            <option value="F-1 Student">F-1 Student</option>
                            <option value="OPT">Post-Completion OPT</option>
                            <option value="H-1B Worker">H-1B Specialty Worker</option>
                            <option value="Green Card / Citizen">Permanent Resident (Green Card) / Citizen</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Sibling Details (State / University)</label>
                          <input
                            type="text"
                            placeholder="e.g. Brother in Texas at UNT"
                            value={siblingUSDetails}
                            onChange={(e) => setSiblingUSDetails(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Nepal Academic Credentials & Tests */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4" /> 3. Academic Credentials & Tests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class 10 (SEE) GPA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3.65 or 3.80"
                  value={seeGpa}
                  onChange={(e) => setSeeGpa(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class 12 (+2 / High School) GPA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3.42 or 3.70"
                  value={plusTwoGpa}
                  onChange={(e) => setPlusTwoGpa(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Standardized Test</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as any)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="PTE">PTE Academic</option>
                  <option value="IELTS">IELTS</option>
                  <option value="Duolingo">Duolingo English Test (DET)</option>
                  <option value="TOEFL">TOEFL iBT</option>
                  <option value="SAT">SAT</option>
                  <option value="GRE">GRE</option>
                  <option value="None">None / Test Waived</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Test Score</label>
                <input
                  type="text"
                  placeholder="e.g. 68 (PTE), 7.0 (IELTS), 1320 (SAT)"
                  value={testScore}
                  onChange={(e) => setTestScore(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Target US Program */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> 4. Target U.S. Academic Program
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="relative" ref={uniRef}>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target U.S. University</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search university (e.g. Midwestern, North Texas...)"
                    value={targetUni}
                    onChange={(e) => handleUniChange(e.target.value)}
                    onFocus={() => targetUni && setShowUniDropdown(true)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-3.5 pr-8 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                {showUniDropdown && filteredUnis.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-xs">
                    {filteredUnis.map((uni, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          setTargetUni(uni);
                          setShowUniDropdown(false);
                        }}
                        className="px-3.5 py-2.5 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-800/80 last:border-0"
                      >
                        {uni}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative" ref={majorRef}>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Major / Field</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search major (e.g. Computer Science, Accounting...)"
                    value={major}
                    onChange={(e) => handleMajorChange(e.target.value)}
                    onFocus={() => major && setShowMajorDropdown(true)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-3.5 pr-8 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                {showMajorDropdown && filteredMajors.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-xs">
                    {filteredMajors.map((m, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          setMajor(m);
                          setShowMajorDropdown(false);
                        }}
                        className="px-3.5 py-2.5 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-800/80 last:border-0"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Degree Level</label>
                <select
                  required
                  value={degreeLevel}
                  onChange={(e) => setDegreeLevel(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Select degree level...</option>
                  <option value="Undergraduate">Undergraduate (Bachelor&apos;s)</option>
                  <option value="Graduate">Graduate (Master&apos;s / PhD)</option>
                  <option value="Community College">Community College / Associate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Study Gap (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  placeholder="Leave empty if zero gap"
                  value={gapYears}
                  onChange={(e) => setGapYears(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Financials & Scholarship */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> 5. Financial Costs & Scholarship Deductions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Gross Annual I-20 Cost (USD $)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 32000"
                  value={grossI20}
                  onChange={(e) => setGrossI20(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Annual Scholarship / Aid (USD $)</label>
                <input
                  type="number"
                  placeholder="Leave empty if 0"
                  value={scholarship}
                  onChange={(e) => setScholarship(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="mt-3 p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Net Annual Tuition Payable to U.S. University:</span>
              </div>
              <div className="text-emerald-400 font-bold text-sm">
                ${netPayableUSD.toLocaleString()} USD / year
              </div>
            </div>
          </div>

          {/* Section 6: Sponsor & Designation */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 6. Sponsor & Nepal Employment Authenticity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Primary Financial Sponsor</label>
                <select
                  value={primarySponsor}
                  onChange={(e) => setPrimarySponsor(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Both Parents">Both Parents</option>
                  <option value="Uncle / Blood Relative">Uncle / Blood Relative</option>
                  <option value="Bank Loan">Education Bank Loan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sponsor Occupation Category</label>
                <select
                  required
                  value={sponsorOccupation}
                  onChange={(e) => setSponsorOccupation(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Select official category...</option>
                  {NEPAL_OCCUPATIONS.map((occ, idx) => (
                    <option key={idx} value={occ}>{occ}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Annual Family Income in Nepal (NPR)
                </label>
                <input
                  type="number"
                  step="50000"
                  required
                  placeholder="e.g. 2400000 (24 Lakhs)"
                  value={annualIncomeNPR}
                  onChange={(e) => setAnnualIncomeNPR(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Specific Designation / Rank (AI Evaluated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Joint Secretary, Managing Director, Specialist Doctor"
                  value={sponsorSubDetails}
                  onChange={(e) => setSponsorSubDetails(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 7: Prior Refusal */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={hasPriorRefusal}
                onChange={(e) => setHasPriorRefusal(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
              />
              <span className="text-xs font-medium text-rose-300">
                I have a previous U.S. Visa Refusal under Section 214(b)
              </span>
            </label>
            {hasPriorRefusal && (
              <textarea
                placeholder="State embassy post, refusal date, and questions asked during prior refusal..."
                value={priorRefusalDetails}
                onChange={(e) => setPriorRefusalDetails(e.target.value)}
                className="w-full mt-1 bg-slate-800/80 border border-rose-800/60 rounded-xl p-3 text-xs text-slate-200 focus:outline-none"
                rows={2}
              />
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition cursor-pointer"
          >
            <span>Lock Dossier & Open Consular CCD Monitor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}