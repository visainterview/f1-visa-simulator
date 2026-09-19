'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfile } from '@/lib/types';
import { US_UNIVERSITIES, MAJORS_LIST, NEPAL_OCCUPATIONS, NEPAL_DISTRICTS } from '@/lib/universityData';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  Users,
  KeyRound,
  Loader2,
  CheckCircle2,
  Clock,
  FileQuestion,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function StudentFormPage() {
  const router = useRouter();

  const [usTime, setUsTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUsTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Secret Admin Modal (Triggered ONLY by Double-Clicking User Icon)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Personal
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [district, setDistrict] = useState('');

  // Siblings & US Ties
  const [hasSiblings, setHasSiblings] = useState(false);
  const [siblingsCount, setSiblingsCount] = useState('');
  const [hasSiblingInUS, setHasSiblingInUS] = useState(false);
  const [siblingUSStatus, setSiblingUSStatus] = useState<any>('');
  const [siblingUSDetails, setSiblingUSDetails] = useState('');

  // Academics
  const [seeGpa, setSeeGpa] = useState('');
  const [plusTwoGpa, setPlusTwoGpa] = useState('');
  const [gapYears, setGapYears] = useState('');

  // Mandatory English Test
  const [englishTestType, setEnglishTestType] = useState<'IELTS' | 'PTE' | 'Duolingo' | 'TOEFL'>('IELTS');
  const [englishTestScore, setEnglishTestScore] = useState('');

  // Optional Aptitude Test
  const [aptitudeTestType, setAptitudeTestType] = useState<'SAT' | 'GRE' | 'None'>('None');
  const [aptitudeTestScore, setAptitudeTestScore] = useState('');

  // Target US Study
  const [targetUni, setTargetUni] = useState('');
  const [major, setMajor] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('');

  // I-20 & Financials Toggle
  const [hasI20, setHasI20] = useState(true);
  const [grossI20, setGrossI20] = useState('');
  const [scholarship, setScholarship] = useState('');
  const [primarySponsor, setPrimarySponsor] = useState('Father');
  const [sponsorOccupation, setSponsorOccupation] = useState('');
  const [sponsorSubDetails, setSponsorSubDetails] = useState('');
  const [annualIncomeNPR, setAnnualIncomeNPR] = useState('');

  // Prior Refusal
  const [hasPriorRefusal, setHasPriorRefusal] = useState(false);
  const [priorRefusalDetails, setPriorRefusalDetails] = useState('');

  // Autocomplete
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

  // Firestore Verification
  const handleVerifyAdminPasscode = async () => {
    if (!adminSecret.trim()) return;
    setIsVerifyingAdmin(true);
    setAdminError('');

    try {
      const usersRef = collection(db, 'users');
      const qRole = query(usersRef, where('role', '==', adminSecret.trim()));
      const snapRole = await getDocs(qRole);

      if (!snapRole.empty) {
        setAdminVerified(true);
      } else {
        const qEmail = query(usersRef, where('email', '==', adminSecret.trim()));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          setAdminVerified(true);
        } else {
          setAdminError('Access Denied: Unrecognized Secret');
        }
      }
    } catch (err: any) {
      setAdminError(`Firestore error: ${err.message}`);
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const executeAdminJump = (destination: '/vo-panel' | '/interview') => {
    const adminTestProfile: StudentProfile = {
      fullName: 'Admin Test Candidate',
      dob: '2004-02-15',
      age: 21,
      isMinor: false,
      address: 'Kathmandu, Nepal',
      country: 'Nepal',
      hasSiblings: true,
      siblingsCount: 1,
      hasSiblingInUS: true,
      siblingUSStatus: 'F-1 Student',
      siblingUSDetails: 'Sister studying Computer Science at UNT',
      seeGpa: '3.80',
      plusTwoGpa: '3.65',
      englishTestType: 'IELTS',
      englishTestScore: '6.5',
      aptitudeTestType: 'SAT',
      aptitudeTestScore: '1340',
      gapYears: 0,
      targetUniversity: 'University of North Texas',
      degreeLevel: 'Undergraduate',
      major: 'Computer Engineering',
      hasI20: true,
      grossI20CostUSD: 34000,
      scholarshipUSD: 10000,
      netI20PayableUSD: 24000,
      primarySponsor: 'Father',
      sponsorOccupation: 'Government Officer (Gazetted / Civil Service)',
      sponsorSubDetails: 'Section Officer at Ministry of Finance',
      annualFamilyIncomeNPR: 2800000,
      hasPriorRefusal: false,
    };

    localStorage.setItem('f1_applicant_profile', JSON.stringify(adminTestProfile));
    setShowAdminModal(false);
    router.push(destination);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !dob || !district) {
      alert('Please fill out your identity and district.');
      return;
    }
    if (!targetUni.trim() || !major.trim() || !degreeLevel) {
      alert('Please enter your target US institution and major.');
      return;
    }
    if (!englishTestScore) {
      alert('Please provide your mandatory English proficiency score.');
      return;
    }
    if (!sponsorOccupation || !annualIncomeNPR) {
      alert('Please complete the sponsorship details.');
      return;
    }
    if (hasI20 && !grossI20) {
      alert('Please enter your gross annual I-20 cost.');
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
      englishTestType,
      englishTestScore: englishTestScore.trim(),
      aptitudeTestType,
      aptitudeTestScore: aptitudeTestScore.trim(),
      gapYears: gapYears === '' ? 0 : Number(gapYears),
      targetUniversity: targetUni.trim(),
      degreeLevel,
      major: major.trim(),
      hasI20,
      grossI20CostUSD: hasI20 ? grossNum : 0,
      scholarshipUSD: hasI20 ? scholarshipNum : 0,
      netI20PayableUSD: hasI20 ? netPayableUSD : 0,
      primarySponsor,
      sponsorOccupation,
      sponsorSubDetails: sponsorSubDetails.trim(),
      annualFamilyIncomeNPR: Number(annualIncomeNPR) || 0,
      hasPriorRefusal,
      priorRefusalDetails: priorRefusalDetails.trim(),
    };

    localStorage.setItem('f1_applicant_profile', JSON.stringify(profileData));
    router.push('/vo-panel');
  };

  return (
    <main className="min-h-screen bg-[#05070E] text-slate-100 p-4 md:p-10 flex flex-col justify-between items-center relative overflow-hidden">
      
      {/* Background Ambient Radial Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-3xl pointer-events-none"></div>

      {/* Secret Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <KeyRound className="w-5 h-5" />
              <span>Consular Adjudicator Console</span>
            </div>

            {!adminVerified ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Verify internal credentials to bypass questionnaire.
                </p>
                <input
                  type="password"
                  placeholder="Enter Secret Key"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyAdminPasscode()}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                />
                <button
                  type="button"
                  onClick={handleVerifyAdminPasscode}
                  disabled={isVerifyingAdmin || !adminSecret.trim()}
                  className="w-full py-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {isVerifyingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Authenticate Access</span>
                </button>
                {adminError && <p className="text-[11px] text-rose-400">{adminError}</p>}
              </div>
            ) : (
              <div className="space-y-3 text-center py-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-emerald-300">Identity Authenticated</div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => executeAdminJump('/vo-panel')}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Open VO CCD
                  </button>
                  <button
                    type="button"
                    onClick={() => executeAdminJump('/interview')}
                    className="flex-1 py-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-blue-500/25"
                  >
                    Open Window
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowAdminModal(false);
                setAdminError('');
              }}
              className="w-full py-1 text-slate-500 text-[11px] hover:text-slate-300 text-center block cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Luxury Dossier Card */}
      <div className="max-w-3xl w-full bg-[#0A0E1A]/90 border border-white/[0.08] rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-7 my-auto relative z-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3.5">
            {/* Double-Click Icon triggers Secret Admin Pass */}
            <div
              onDoubleClick={() => setShowAdminModal(true)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 cursor-pointer select-none transition hover:border-blue-400 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/10"
              title="Identity Badge"
            >
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">F-1 Student Visa Dossier</h1>
                <span className="text-base select-none inline-block filter drop-shadow">🇺🇸</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">U.S. Embassy Kathmandu • Consular Adjudication System</p>
            </div>
          </div>

          {/* Live US Time Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>US Eastern: {usTime || 'Loading...'}</span>
          </div>
        </div>

        {/* 2026 Directive Notice */}
        <div className="p-4 bg-gradient-to-r from-rose-950/40 to-slate-900/40 border border-rose-800/50 rounded-2xl flex items-start gap-3.5 shadow-inner">
          <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-rose-200 tracking-wide uppercase text-[11px]">
              Section 214(b) Presumption Directive
            </div>
            <p className="text-rose-300/80 leading-relaxed">
              Nepal F-1 refusal rates exceed <strong>81%</strong>. The Consular Officer is legally mandated to <strong>presume immigrant intent</strong>. The initial adjudicative stance is <strong>REJECTION</strong> until proven otherwise.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          
          {/* Section 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">01</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Personal Identity & Citizenship</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Passport Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full passport name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:bg-white/[0.04] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/80 focus:bg-white/[0.04] transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Citizenship District in Nepal</label>
                <select
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-[#080C16] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/80 transition"
                >
                  <option value="">Select your permanent citizenship district...</option>
                  {NEPAL_DISTRICTS.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Siblings & US Family */}
          <div className="p-4 bg-white/[0.02] border border-white/[0.07] rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">02</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Siblings & U.S. Family Ties</h2>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 pt-1">
              <input
                type="checkbox"
                checked={hasSiblings}
                onChange={(e) => setHasSiblings(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-white/20"
              />
              <span>I have siblings (brother or sister)</span>
            </label>

            {hasSiblings && (
              <div className="pl-6 space-y-3 pt-1">
                <div className="w-44">
                  <label className="block text-[11px] text-slate-400 mb-1">Total Number of Siblings</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1 or 2"
                    value={siblingsCount}
                    onChange={(e) => setSiblingsCount(e.target.value)}
                    className="w-full bg-[#060A13] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-rose-300">
                    <input
                      type="checkbox"
                      checked={hasSiblingInUS}
                      onChange={(e) => setHasSiblingInUS(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-rose-700"
                    />
                    <span>⚠️ A sibling is currently living, studying, or working in the U.S.</span>
                  </label>

                  {hasSiblingInUS && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Sibling's Status</label>
                        <select
                          value={siblingUSStatus}
                          onChange={(e) => setSiblingUSStatus(e.target.value)}
                          className="w-full bg-[#060A13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">Select status...</option>
                          <option value="F-1 Student">F-1 Student</option>
                          <option value="OPT">Post-Completion OPT</option>
                          <option value="H-1B Worker">H-1B Worker</option>
                          <option value="Green Card / Citizen">Permanent Resident (Green Card) / Citizen</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Details (University / State)</label>
                        <input
                          type="text"
                          placeholder="e.g. Sister at UNT in Texas"
                          value={siblingUSDetails}
                          onChange={(e) => setSiblingUSDetails(e.target.value)}
                          className="w-full bg-[#060A13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Academics */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">03</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Grades & Standardized Testing</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Class 10 (SEE) GPA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3.65"
                  value={seeGpa}
                  onChange={(e) => setSeeGpa(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/80 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Class 12 (+2 / High School) GPA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3.45"
                  value={plusTwoGpa}
                  onChange={(e) => setPlusTwoGpa(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/80 transition"
                />
              </div>

              {/* Mandatory English Test */}
              <div className="p-4 bg-gradient-to-r from-blue-950/20 to-slate-900/30 border border-blue-900/40 rounded-2xl md:col-span-2 space-y-2">
                <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wide">Mandatory English Language Proficiency</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Test Taken</label>
                    <select
                      value={englishTestType}
                      onChange={(e) => setEnglishTestType(e.target.value as any)}
                      className="w-full bg-[#060A13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="IELTS">IELTS (Academic)</option>
                      <option value="PTE">PTE Academic</option>
                      <option value="Duolingo">Duolingo English Test (DET)</option>
                      <option value="TOEFL">TOEFL iBT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Score Obtained</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 6.5 (IELTS), 60 (PTE)"
                      value={englishTestScore}
                      onChange={(e) => setEnglishTestScore(e.target.value)}
                      className="w-full bg-[#060A13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Aptitude Test */}
              <div className="p-4 bg-white/[0.02] border border-white/[0.07] rounded-2xl md:col-span-2 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Optional Standardized Test (SAT / GRE)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Test Taken</label>
                    <select
                      value={aptitudeTestType}
                      onChange={(e) => setAptitudeTestType(e.target.value as any)}
                      className="w-full bg-[#060A13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="None">None / Not Taken</option>
                      <option value="SAT">SAT</option>
                      <option value="GRE">GRE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Score (Optional)</label>
                    <input
                      type="text"
                      disabled={aptitudeTestType === 'None'}
                      placeholder="e.g. 1320 (SAT)"
                      value={aptitudeTestScore}
                      onChange={(e) => setAptitudeTestScore(e.target.value)}
                      className="w-full bg-[#060A13] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Target US Program */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">04</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Target U.S. Academic Program</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative" ref={uniRef}>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target University</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search university..."
                    value={targetUni}
                    onChange={(e) => handleUniChange(e.target.value)}
                    onFocus={() => targetUni && setShowUniDropdown(true)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-4 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/80 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                {showUniDropdown && filteredUnis.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1.5 max-h-52 overflow-y-auto bg-[#0A0E1A] border border-white/15 rounded-2xl shadow-2xl text-xs">
                    {filteredUnis.map((uni, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          setTargetUni(uni);
                          setShowUniDropdown(false);
                        }}
                        className="px-4 py-2.5 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-white/[0.05] last:border-0 text-slate-200"
                      >
                        {uni}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative" ref={majorRef}>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Major</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search major..."
                    value={major}
                    onChange={(e) => handleMajorChange(e.target.value)}
                    onFocus={() => major && setShowMajorDropdown(true)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-4 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/80 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                {showMajorDropdown && filteredMajors.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1.5 max-h-52 overflow-y-auto bg-[#0A0E1A] border border-white/15 rounded-2xl shadow-2xl text-xs">
                    {filteredMajors.map((m, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          setMajor(m);
                          setShowMajorDropdown(false);
                        }}
                        className="px-4 py-2.5 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-white/[0.05] last:border-0 text-slate-200"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Degree Level</label>
                <select
                  required
                  value={degreeLevel}
                  onChange={(e) => setDegreeLevel(e.target.value)}
                  className="w-full bg-[#080C16] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/80 transition"
                >
                  <option value="">Select degree level...</option>
                  <option value="Undergraduate">Undergraduate (Bachelor&apos;s)</option>
                  <option value="Graduate">Graduate (Master&apos;s / PhD)</option>
                  <option value="Community College">Community College</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Study Gap (Years)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={gapYears}
                  onChange={(e) => setGapYears(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/80 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Financials & I-20 Toggle */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">05</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Institutional Costs & Sponsorship</h2>
            </div>

            {/* I-20 Toggle */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.07] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <FileQuestion className="w-4 h-4 text-blue-400" />
                <span>Do you currently hold an officially issued I-20 document?</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasI20}
                  onChange={(e) => setHasI20(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {hasI20 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Gross Annual I-20 Cost ($)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 34000"
                      value={grossI20}
                      onChange={(e) => setGrossI20(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Annual Scholarship ($)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={scholarship}
                      onChange={(e) => setScholarship(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/[0.07] rounded-2xl flex justify-between items-center text-xs">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-400" /> Net Annual Tuition Payable:
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">${netPayableUSD.toLocaleString()} USD / yr</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-blue-950/20 border border-blue-900/40 rounded-xl text-xs text-blue-300 flex items-center gap-2">
                <span>ℹ️</span>
                <span>Pre-I-20 Mode: The Consular Officer will evaluate based on your university choice and stated budget.</span>
              </div>
            )}
          </div>

          {/* Section 6: Sponsorship */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">06</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Sponsorship & Employment</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Primary Sponsor</label>
                <select
                  value={primarySponsor}
                  onChange={(e) => setPrimarySponsor(e.target.value)}
                  className="w-full bg-[#080C16] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Both Parents">Both Parents</option>
                  <option value="Uncle / Blood Relative">Uncle / Blood Relative</option>
                  <option value="Bank Loan">Education Bank Loan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Sponsor Category</label>
                <select
                  required
                  value={sponsorOccupation}
                  onChange={(e) => setSponsorOccupation(e.target.value)}
                  className="w-full bg-[#080C16] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="">Select official category...</option>
                  {NEPAL_OCCUPATIONS.map((occ, idx) => (
                    <option key={idx} value={occ}>{occ}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Family Annual Income (NPR)</label>
                <input
                  type="number"
                  step="50000"
                  required
                  placeholder="e.g. 2400000 (24 Lakhs)"
                  value={annualIncomeNPR}
                  onChange={(e) => setAnnualIncomeNPR(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Designation / Rank</label>
                <input
                  type="text"
                  placeholder="e.g. Joint Secretary, Managing Director"
                  value={sponsorSubDetails}
                  onChange={(e) => setSponsorSubDetails(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 transition cursor-pointer text-sm"
          >
            <span>Lock Dossier & Open Consular CCD Monitor</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Luxury Footer */}
      <footer className="w-full max-w-3xl mt-8 pt-4 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center text-[11px] text-slate-500 gap-2 z-10">
        <div className="flex items-center gap-2">
          <span>🇺🇸</span>
          <span>U.S. Embassy Consular Simulation Engine • Kathmandu Post</span>
        </div>
        <div>
          © 2026 INA 214(b) Adjudication System. All rights reserved.
        </div>
      </footer>
    </main>
  );
}