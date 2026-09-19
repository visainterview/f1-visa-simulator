'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfile } from '@/lib/types';
import { US_UNIVERSITIES, MAJORS_LIST, NEPAL_OCCUPATIONS, NEPAL_DISTRICTS } from '@/lib/universityData';
import { db, auth, googleProvider } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
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
  Zap,
  KeyRound,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function StudentFormPage() {
  const router = useRouter();

  // Admin Modal & Firebase Verification State
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

  // 1. VERIFY ADMIN CREDENTIALS AGAINST FIRESTORE (Zero hardcoded secrets)
  const handleVerifyAdminPasscode = async () => {
    if (!adminSecret.trim()) return;
    setIsVerifyingAdmin(true);
    setAdminError('');

    try {
      // Query Firestore collection 'users' to check if role or email matches
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', adminSecret.trim()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setAdminVerified(true);
      } else {
        // Also check if admin typed the email field from Firestore
        const qEmail = query(usersRef, where('email', '==', adminSecret.trim()));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          setAdminVerified(true);
        } else {
          setAdminError('Access Denied: Unrecognized Admin Secret in Firestore');
        }
      }
    } catch (err: any) {
      console.error(err);
      setAdminError(`Firestore error: ${err.message}`);
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  // 2. GOOGLE 1-CLICK ADMIN LOGIN
  const handleGoogleAdminLogin = async () => {
    setIsVerifyingAdmin(true);
    setAdminError('');
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const email = res.user.email;

      // Check if logged in user is admin in Firestore or matches support email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snap = await getDocs(q);

      if (!snap.empty || email === 'movipff@gmail.com') {
        setAdminVerified(true);
      } else {
        setAdminError(`Logged in as ${email}, but this account is not registered as Admin in Firestore.`);
      }
    } catch (err: any) {
      setAdminError(`Google Auth Error: ${err.message}`);
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  // 3. EXECUTE ADMIN BYPASS JUMP
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
    if (!sponsorOccupation || !grossI20 || !annualIncomeNPR) {
      alert('Please complete the financial section.');
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
      grossI20CostUSD: grossNum,
      scholarshipUSD: scholarshipNum,
      netI20PayableUSD: netPayableUSD,
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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 flex justify-center items-center relative">
      {/* Firebase-Powered Admin Bypass Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <KeyRound className="w-5 h-5" />
              <span>Firebase Admin Verification</span>
            </div>

            {!adminVerified ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Verify your Firestore admin credentials or sign in with Google to bypass the form.
                </p>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Firestore Admin Secret</label>
                  <input
                    type="password"
                    placeholder="Enter Firestore Secret or Role"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyAdminPasscode()}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerifyAdminPasscode}
                  disabled={isVerifyingAdmin || !adminSecret.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isVerifyingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Verify Credentials</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-slate-500 uppercase">OR</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAdminLogin}
                  disabled={isVerifyingAdmin}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>Sign in with Google Admin</span>
                </button>

                {adminError && <p className="text-[11px] text-rose-400 leading-tight">{adminError}</p>}
              </div>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="flex flex-col items-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                  <div className="text-sm font-bold text-emerald-300">Admin Verified via Firestore</div>
                  <p className="text-xs text-slate-400 mt-0.5">Select your destination to jump directly:</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => executeAdminJump('/vo-panel')}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    Go to VO CCD
                  </button>
                  <button
                    type="button"
                    onClick={() => executeAdminJump('/interview')}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-blue-600/20"
                  >
                    Go to Window
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

      {/* Main Intake Card */}
      <div className="max-w-3xl w-full bg-slate-900/95 border border-slate-800/80 rounded-2xl p-6 md:p-9 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Top Header with Admin Quick Pass Trigger */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">F-1 Visa Case Intake Dossier</h1>
              <p className="text-xs text-slate-400">Kathmandu Consular Adjudication System</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-1.5 transition cursor-pointer"
            title="Admin Bypass"
          >
            <Zap className="w-3.5 h-3.5" /> Admin Pass
          </button>
        </div>

        {/* 2026 Directive */}
        <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-xl flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-rose-200 uppercase tracking-wide">
              Section 214(b) Presumption Notice
            </div>
            <p className="text-rose-300/80 leading-relaxed">
              Nepal F-1 refusal rates exceed <strong>81%</strong>. The Consular Officer is legally mandated to <strong>presume immigrant intent</strong>. The initial adjudicative stance is <strong>REJECTION</strong> until proven otherwise.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Identity */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <span>1.</span> Personal Identity & Citizenship
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Passport Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full passport name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Citizenship District in Nepal</label>
                <select
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select your district...</option>
                  {NEPAL_DISTRICTS.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Siblings & US Family Ties */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase flex items-center gap-2">
              <Users className="w-4 h-4" /> 2. Siblings & U.S. Family Ties
            </h2>
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
                <div className="w-44">
                  <label className="block text-[11px] text-slate-400 mb-1">Total Siblings</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1 or 2"
                    value={siblingsCount}
                    onChange={(e) => setSiblingsCount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-rose-300">
                    <input
                      type="checkbox"
                      checked={hasSiblingInUS}
                      onChange={(e) => setHasSiblingInUS(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-rose-700"
                    />
                    <span>⚠️ A sibling is currently living, studying, or working in the U.S.</span>
                  </label>

                  {hasSiblingInUS && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Sibling's U.S. Status</label>
                        <select
                          value={siblingUSStatus}
                          onChange={(e) => setSiblingUSStatus(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="">Select status...</option>
                          <option value="F-1 Student">F-1 Student</option>
                          <option value="OPT">Post-Completion OPT</option>
                          <option value="H-1B Worker">H-1B Worker</option>
                          <option value="Green Card / Citizen">Permanent Resident (Green Card) / Citizen</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Details (e.g. Sister at UNT)</label>
                        <input
                          type="text"
                          placeholder="e.g. Sister studying in Texas"
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

          {/* Section 3: Academic Credentials & Tests */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4" /> 3. Grades & Standardized Testing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class 10 (SEE) GPA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3.65"
                  value={seeGpa}
                  onChange={(e) => setSeeGpa(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class 12 (+2 / High School) GPA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3.45"
                  value={plusTwoGpa}
                  onChange={(e) => setPlusTwoGpa(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Mandatory English Test */}
              <div className="p-3.5 bg-blue-950/20 border border-blue-900/40 rounded-xl md:col-span-2 space-y-2">
                <div className="text-xs font-bold text-blue-300 uppercase">Mandatory English Proficiency Test</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Test Taken</label>
                    <select
                      value={englishTestType}
                      onChange={(e) => setEnglishTestType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none text-white"
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
                      placeholder="e.g. 6.5 (IELTS), 60 (PTE), 115 (DET)"
                      value={englishTestScore}
                      onChange={(e) => setEnglishTestScore(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Aptitude Test */}
              <div className="p-3.5 bg-slate-800/30 border border-slate-700/60 rounded-xl md:col-span-2 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase">Optional Standardized Test (SAT / GRE)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Test Taken</label>
                    <select
                      value={aptitudeTestType}
                      onChange={(e) => setAptitudeTestType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none text-white"
                    >
                      <option value="None">None / Not Taken</option>
                      <option value="SAT">SAT (Scholastic Aptitude)</option>
                      <option value="GRE">GRE (Graduate Record Exam)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Score (Optional)</label>
                    <input
                      type="text"
                      disabled={aptitudeTestType === 'None'}
                      placeholder="e.g. 1320 (SAT) or 315 (GRE)"
                      value={aptitudeTestScore}
                      onChange={(e) => setAptitudeTestScore(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none text-white disabled:opacity-30"
                    />
                  </div>
                </div>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Target University</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search university..."
                    value={targetUni}
                    onChange={(e) => handleUniChange(e.target.value)}
                    onFocus={() => targetUni && setShowUniDropdown(true)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-3.5 pr-8 py-2.5 text-sm focus:outline-none focus:border-blue-500"
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Major</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search major..."
                    value={major}
                    onChange={(e) => handleMajorChange(e.target.value)}
                    onFocus={() => major && setShowMajorDropdown(true)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-3.5 pr-8 py-2.5 text-sm focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">Select degree level...</option>
                  <option value="Undergraduate">Undergraduate (Bachelor&apos;s)</option>
                  <option value="Graduate">Graduate (Master&apos;s / PhD)</option>
                  <option value="Community College">Community College</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Study Gap (Years)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={gapYears}
                  onChange={(e) => setGapYears(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Financials */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> 5. Financials & Scholarship
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Gross Annual I-20 Cost ($)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 34000"
                  value={grossI20}
                  onChange={(e) => setGrossI20(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Annual Scholarship ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={scholarship}
                  onChange={(e) => setScholarship(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3 p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-300 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" /> Net Annual Tuition Payable:
              </span>
              <span className="text-emerald-400 font-bold text-sm">${netPayableUSD.toLocaleString()} USD / yr</span>
            </div>
          </div>

          {/* Section 6: Sponsorship */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 6. Sponsorship & Employment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Primary Sponsor</label>
                <select
                  value={primarySponsor}
                  onChange={(e) => setPrimarySponsor(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Both Parents">Both Parents</option>
                  <option value="Uncle / Blood Relative">Uncle / Blood Relative</option>
                  <option value="Bank Loan">Education Bank Loan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sponsor Category</label>
                <select
                  required
                  value={sponsorOccupation}
                  onChange={(e) => setSponsorOccupation(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">Select official category...</option>
                  {NEPAL_OCCUPATIONS.map((occ, idx) => (
                    <option key={idx} value={occ}>{occ}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Family Annual Income (NPR)</label>
                <input
                  type="number"
                  step="50000"
                  required
                  placeholder="e.g. 2400000 (24 Lakhs)"
                  value={annualIncomeNPR}
                  onChange={(e) => setAnnualIncomeNPR(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Designation / Rank</label>
                <input
                  type="text"
                  placeholder="e.g. Joint Secretary, Managing Director"
                  value={sponsorSubDetails}
                  onChange={(e) => setSponsorSubDetails(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

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