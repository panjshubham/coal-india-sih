import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Core Dashboard
      "dashboard_title": "National Command",
      "subsidiary_radar": "Subsidiary Radar",
      "recalculate": "Recalculate Risk Scores (AI)",
      "dgms_audit": "DGMS AUDIT CYCLE",
      "surveillance": "Surveillance Perimeter",
      "active_mines": "Active Mines Under Radar",
      "regulatory": "Regulatory Rating",
      "compliance": "DGMS Statutory Compliance",
      "emergency": "Emergency Protocol",
      "active_alerts": "Active Pit Alerts & Hazards",
      "crypto_audit": "Cryptographic Audit",
      "verified_ledger": "Verified Dispatch Ledger",

      // Sidebar Nav
      "nav_dashboard_colliery": "Colliery Manager",
      "nav_dashboard_corporate": "Corporate HQ",
      "nav_dashboard_regulator": "Regulator Portal",
      "nav_dashboard": "Dashboard",
      "nav_statutoryRegisters": "CMR Statutory Books",
      "nav_compliance": "Compliance",
      "nav_inspections": "Inspections",
      "nav_violations": "Violations",
      "nav_map": "Mines Map",
      "nav_contractors": "Contractors",
      "nav_manageUsers": "Manage Users",
      "nav_dataImport": "Data Import",
      "nav_aiWorkbench": "AI Workbench",
      "nav_audit": "Audit Log",
      "nav_profile": "Officer Profile",

      // Landing / Homepage
      "landing_title": "CoalGuard",
      "landing_subtitle": "AI-Based Smart Governance and Compliance Monitoring System",
      "landing_cta": "Sign In to Command Center",
      "feat_1_title": "Real-Time Monitoring",
      "feat_1_desc": "Continuous surveillance of active mining operations.",
      "feat_2_title": "AI Risk Detection",
      "feat_2_desc": "Automated identification of critical regulatory breaches.",
      "feat_3_title": "Geo-Tagged Inspections",
      "feat_3_desc": "Mobile auditing with forced GPS metadata.",
      "feat_4_title": "Automated Workflows",
      "feat_4_desc": "Instant escalation pathways for safety hazards.",

      // Mobile Form (NewInspection.tsx)
      "form_title": "Log Violation",
      "form_mine": "Select Mine",
      "form_type": "Inspection Type",
      "form_category": "Category",
      "form_severity": "Severity",
      "form_desc": "Description",
      "form_photo": "Photo Evidence",
      "form_submit": "Submit Inspection",
      "form_offline_notice": "Saved offline - will sync when connected",
      
      // Status Labels
      "status_active": "Active",
      "status_critical": "Critical",
      "status_high": "High",
      "status_medium": "Medium",
      "status_low": "Low",
      "status_compliant": "Compliant"
    }
  },
  hi: {
    translation: {
      // Core Dashboard
      "dashboard_title": "राष्ट्रीय कमान (National Command)",
      "subsidiary_radar": "सहायक रडार (Subsidiary Radar)",
      "recalculate": "जोखिम स्कोर की पुनर्गणना (AI)",
      "dgms_audit": "डीजीएमएस ऑडिट साइकिल (DGMS AUDIT CYCLE)",
      "surveillance": "निगरानी परिधि (Surveillance Perimeter)",
      "active_mines": "रडार के तहत सक्रिय खदानें (Active Mines Under Radar)",
      "regulatory": "नियामक रेटिंग (Regulatory Rating)",
      "compliance": "डीजीएमएस वैधानिक अनुपालन (DGMS Statutory Compliance)",
      "emergency": "आपातकालीन प्रोटोकॉल (Emergency Protocol)",
      "active_alerts": "सक्रिय खदान अलर्ट (Active Pit Alerts & Hazards)",
      "crypto_audit": "क्रिप्टोग्राफ़िक ऑडिट (Cryptographic Audit)",
      "verified_ledger": "सत्यापित डिस्पैच लेजर (Verified Dispatch Ledger)",

      // Sidebar Nav
      "nav_dashboard_colliery": "कोलिरी प्रबंधक (Colliery)",
      "nav_dashboard_corporate": "कॉर्पोरेट मुख्यालय (Corporate)",
      "nav_dashboard_regulator": "नियामक पोर्टल (Regulator)",
      "nav_dashboard": "डैशबोर्ड",
      "nav_statutoryRegisters": "वैधानिक रजिस्टर (CMR Books)",
      "nav_compliance": "अनुपालन",
      "nav_inspections": "निरीक्षण",
      "nav_violations": "उल्लंघन",
      "nav_map": "खदान मानचित्र",
      "nav_contractors": "ठेकेदार",
      "nav_manageUsers": "उपयोगकर्ता प्रबंधन",
      "nav_dataImport": "डेटा आयात",
      "nav_aiWorkbench": "एआई वर्कबेंच (AI Workbench)",
      "nav_audit": "ऑडिट लॉग",
      "nav_profile": "अधिकारी प्रोफ़ाइल",

      // Landing / Homepage
      "landing_title": "CoalGuard",
      "landing_subtitle": "एआई-आधारित स्मार्ट गवर्नेंस और अनुपालन निगरानी प्रणाली",
      "landing_cta": "कमांड सेंटर में प्रवेश करें",
      "feat_1_title": "रीयल-टाइम निगरानी",
      "feat_1_desc": "सक्रिय खनन कार्यों की निरंतर निगरानी।",
      "feat_2_title": "एआई जोखिम पहचान",
      "feat_2_desc": "महत्वपूर्ण नियामक उल्लंघनों की स्वचालित पहचान।",
      "feat_3_title": "जियो-टैग किए गए निरीक्षण",
      "feat_3_desc": "जीपीएस मेटाडेटा के साथ मोबाइल ऑडिटिंग।",
      "feat_4_title": "स्वचालित वर्कफ़्लो",
      "feat_4_desc": "सुरक्षा खतरों के लिए त्वरित वृद्धि मार्ग।",

      // Mobile Form (NewInspection.tsx)
      "form_title": "उल्लंघन दर्ज करें",
      "form_mine": "खदान चुनें",
      "form_type": "निरीक्षण का प्रकार",
      "form_category": "श्रेणी",
      "form_severity": "गंभीरता",
      "form_desc": "विवरण",
      "form_photo": "तस्वीर साक्ष्य",
      "form_submit": "निरीक्षण जमा करें",
      "form_offline_notice": "ऑफ़लाइन सहेजा गया - कनेक्ट होने पर सिंक हो जाएगा",

      // Status Labels
      "status_active": "सक्रिय",
      "status_critical": "अति गंभीर",
      "status_high": "उच्च",
      "status_medium": "मध्यम",
      "status_low": "निम्न",
      "status_compliant": "अनुपालन"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
