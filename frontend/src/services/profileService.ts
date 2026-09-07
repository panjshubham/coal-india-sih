export interface InspectorProfile {
  fullName: string;
  designation: string;
  badgeId: string;
  subsidiary: string;
  primaryPhone: string;
  email: string;
  secondaryPhone: string; // Secondary number for informing family
  familyContactName: string;
  familyRelationship: string;
  familyAddress: string;
  bloodGroup: string;
  medicalAlert: string;
  notifyFamilyOnAlert: boolean;
  familyAlertChannel: string;
  role?: string;
  lastUpdated?: string;
}

const STORAGE_KEY = 'coalguard_officer_profile';

export const DEFAULT_PROFILE: InspectorProfile = {
  fullName: 'Shri R. K. Mahapatra',
  designation: 'Chief Inspector of Mines (DGMS)',
  badgeId: 'DGMS-EZ-2024-8841',
  subsidiary: 'BCCL - Bharat Coking Coal Ltd (Dhanbad)',
  primaryPhone: '+91 98312 45678',
  email: 'rk.mahapatra@dgms.gov.in',
  secondaryPhone: '+91 94311 87654',
  familyContactName: 'Smt. Sunita Mahapatra',
  familyRelationship: 'Spouse',
  familyAddress: 'Quarter B-14, CIL Officers Colony, Koyla Nagar, Dhanbad, Jharkhand - 826005',
  bloodGroup: 'O+',
  medicalAlert: 'High-particulate respiratory sensitivity (carry personal inhaler in underground seam)',
  notifyFamilyOnAlert: true,
  familyAlertChannel: 'SMS & WhatsApp SOS Protocol',
  lastUpdated: new Date().toISOString(),
};

export function getProfile(): InspectorProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Error reading profile from localStorage', e);
  }
  return DEFAULT_PROFILE;
}

export function saveProfile(profile: InspectorProfile): void {
  try {
    const updated = { ...profile, lastUpdated: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event to notify components across the app
    window.dispatchEvent(new CustomEvent('coalguard:profileUpdated', { detail: updated }));
  } catch (e) {
    console.error('Error saving profile to localStorage', e);
  }
}
