import { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  HeartHandshake, 
  ShieldAlert, 
  Save, 
  CheckCircle2, 
  Building2, 
  Mail, 
  FileText, 
  Activity, 
  BellRing,
  SendHorizontal
} from 'lucide-react';
import { getProfile, saveProfile, type InspectorProfile } from '../services/profileService';

export default function Profile() {
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());
  const [isSaved, setIsSaved] = useState(false);
  const [testAlertSent, setTestAlertSent] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const handleChange = (field: keyof InspectorProfile, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(profile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 4000);
  };

  const handleSendTestNotification = () => {
    setTestAlertSent(true);
    setTimeout(() => setTestAlertSent(false), 5000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f2b5c] to-blue-800 flex items-center justify-center text-white text-2xl font-black shadow-md border-2 border-amber-400">
            {profile.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                {profile.badgeId}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{profile.designation}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{profile.subsidiary}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSendTestNotification}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <SendHorizontal className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Test Family SMS Alert</span>
          </button>
        </div>
      </div>

      {/* Test Notification Feedback Toast */}
      {testAlertSent && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-xl p-4 flex items-start gap-3 shadow-md animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200">
            <p className="font-bold">Test Emergency Family Dispatch Simulated!</p>
            <p className="mt-1">
              Automated SMS broadcast simulated to <strong>{profile.familyContactName}</strong> ({profile.secondaryPhone}):
              <br />
              <em className="text-emerald-700 dark:text-emerald-300">
                "[DGMS-CIL ALERT] Officer {profile.fullName} safety status check verified. Primary Seam Sector: Safe."
              </em>
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Secondary / Family Emergency Contact - HIGHLIGHTED */}
        <div className="bg-gradient-to-br from-amber-500/5 via-white to-red-500/5 dark:from-gray-800 dark:to-gray-800/90 rounded-2xl border-2 border-amber-500/40 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-amber-200/80 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-400 flex items-center justify-center font-bold">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Family Emergency Protocol & Secondary Contact
                  <span className="bg-red-100 text-red-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-red-200 uppercase">
                    Mandatory DGMS CMR 2017
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Designated secondary telephone line used by the Mine Rescue Station to immediately notify family in case of pit incidents or emergency evacuation.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Secondary Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Secondary Mobile No. (Family Contact) *
              </label>
              <input
                type="tel"
                required
                value={profile.secondaryPhone}
                onChange={(e) => handleChange('secondaryPhone', e.target.value)}
                placeholder="+91 94311 XXXXX"
                className="w-full px-3.5 py-2.5 rounded-lg border border-amber-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Official emergency SMS notifications and WhatsApp alerts will be dispatched to this number.
              </p>
            </div>

            {/* Family Contact Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Next of Kin / Family Contact Name *
              </label>
              <input
                type="text"
                required
                value={profile.familyContactName}
                onChange={(e) => handleChange('familyContactName', e.target.value)}
                placeholder="e.g. Smt. Sunita Mahapatra"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
              />
            </div>

            {/* Relationship */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                Relationship
              </label>
              <select
                value={profile.familyRelationship}
                onChange={(e) => handleChange('familyRelationship', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
              >
                <option value="Spouse">Spouse</option>
                <option value="Parent (Father/Mother)">Parent (Father/Mother)</option>
                <option value="Son / Daughter">Son / Daughter</option>
                <option value="Sibling (Brother/Sister)">Sibling (Brother/Sister)</option>
                <option value="Legal Guardian">Legal Guardian</option>
                <option value="Other Family Member">Other Family Member</option>
              </select>
            </div>

            {/* Blood Group */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-red-500" />
                Officer Blood Group
              </label>
              <select
                value={profile.bloodGroup}
                onChange={(e) => handleChange('bloodGroup', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
              >
                <option value="O+">O+ Positive</option>
                <option value="O-">O- Negative</option>
                <option value="A+">A+ Positive</option>
                <option value="A-">A- Negative</option>
                <option value="B+">B+ Positive</option>
                <option value="B-">B- Negative</option>
                <option value="AB+">AB+ Positive</option>
                <option value="AB-">AB- Negative</option>
              </select>
            </div>

            {/* Family Residential Address */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-500" />
                Family Residential Address (Coal India Township / Colony)
              </label>
              <input
                type="text"
                value={profile.familyAddress}
                onChange={(e) => handleChange('familyAddress', e.target.value)}
                placeholder="Quarter number, Colony name, City, State, PIN"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
              />
            </div>

            {/* Medical Precautions */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                Medical Precautions / Underground Pit Allergies
              </label>
              <input
                type="text"
                value={profile.medicalAlert}
                onChange={(e) => handleChange('medicalAlert', e.target.value)}
                placeholder="e.g. Asthma, Penicillin allergy, Wear high-filtration respirator"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
              />
            </div>

            {/* Emergency Toggle */}
            <div className="md:col-span-2 flex items-center justify-between p-4 bg-amber-50/50 dark:bg-gray-750 rounded-xl border border-amber-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    Automated Incident Broadcast to Secondary Number
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Directly dispatch statutory alert SMS if severe pit methane levels exceed 1.25% or an emergency evacuation is flagged.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notifyFamilyOnAlert}
                  onChange={(e) => handleChange('notifyFamilyOnAlert', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Officer Statutory Details */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Officer Statutory Identification
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                DGMS statutory inspection credentials and primary official communications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={profile.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
              />
            </div>

            {/* Official Designation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Statutory Role / Designation *
              </label>
              <input
                type="text"
                required
                value={profile.designation}
                onChange={(e) => handleChange('designation', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
              />
            </div>

            {/* DGMS Badge ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                DGMS Officer Badge ID
              </label>
              <input
                type="text"
                required
                value={profile.badgeId}
                onChange={(e) => handleChange('badgeId', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
              />
            </div>

            {/* Subsidiary */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                CIL Subsidiary & Circle
              </label>
              <input
                type="text"
                value={profile.subsidiary}
                onChange={(e) => handleChange('subsidiary', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
              />
            </div>

            {/* Primary Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                Primary Mobile No. (Officer Handset)
              </label>
              <input
                type="tel"
                value={profile.primaryPhone}
                onChange={(e) => handleChange('primaryPhone', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                Official NIC / DGMS Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Profile stored locally with cryptographic tamper checksum.</span>
          </div>

          <div className="flex items-center gap-3">
            {isSaved && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Profile & Family Details Saved!
              </span>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs tracking-wide uppercase transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Profile Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
