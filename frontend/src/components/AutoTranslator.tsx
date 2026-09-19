import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

const MANUAL_HINDI_MAP: Record<string, string> = {
  // Common Headers & Metrics
  "MONITORED MINES": "निगरानी वाली खदानें",
  "ACTIVE VIOLATIONS": "सक्रिय उल्लंघन",
  "OVERDUE COMPLIANCE": "अतिदेय अनुपालन",
  "AI RISK SCORE": "एआई जोखिम स्कोर",
  "100% Active": "100% सक्रिय",
  "3 Needs Action": "3 कार्रवाई आवश्यक",
  "Action Flagged": "कार्रवाई फ़्लैग की गई",
  "AI Predicted": "एआई अनुमानित",
  "SUBSIDIARY RISK & COMPLIANCE STATUS": "सहायक जोखिम और अनुपालन स्थिति",
  "SUBSIDIARY RISK & STATUTORY AUDIT STATUS": "सहायक जोखिम और वैधानिक ऑडिट स्थिति",
  "Showing 4 Facilities": "4 सुविधाएं दिखा रहा है",
  "MINE & COORDINATES": "खदान एवं निर्देशांक",
  "RISK INDEX": "जोखिम सूचकांक",
  "STATUS": "स्थिति",
  "ACTION REQUIRED": "आवश्यक कार्रवाई",
  "ACTION": "कार्रवाई",
  "View Details": "विवरण देखें",
  "IMMEDIATE ACTION": "तत्काल कार्रवाई",
  "Monitor Routine": "नियमित निगरानी",
  "Compliant": "अनुपालन",
  "3 Active Issues": "3 सक्रिय समस्याएं",
  "2 Active Issues": "2 सक्रिय समस्याएं",
  "1 Active Issues": "1 सक्रिय समस्या",
  "0 Active Issues": "0 समस्या",
  "AI RISK ANALYSIS": "एआई जोखिम विश्लेषण",
  "HIGH PRIORITY": "उच्च प्राथमिकता",
  "MODERATE": "मध्यम",
  "LOW RISK": "कम जोखिम",
  "Overall Compliance:": "समग्र अनुपालन:",
  "View All 18 Mines ->": "सभी 18 खदानें देखें ->",
  "EXPORT REPORT (PDF)": "रिपोर्ट निर्यात करें (PDF)",
  "LIVE MONITORING ACTIVE": "लाइव निगरानी सक्रिय",
  "Regulator Oversight Portal": "नियामक निगरानी पोर्टल",
  "Real-time compliance monitoring across all subsidiary operations.": "सभी सहायक परिचालन में रीयल-टाइम अनुपालन निगरानी।",
  "Filter:": "फ़िल्टर:",
  "Search mine name...": "खदान का नाम खोजें...",

  // Colliery & Corporate
  "Colliery Manager Console": "कोलिरी प्रबंधक कंसोल",
  "HQ Command Center": "मुख्यालय कमांड सेंटर",
  "Enterprise-wide telemetric aggregation & autonomous statutory compliance tracking.": "उद्यम-व्यापी टेलीमेट्रिक एकत्रीकरण और स्वायत्त वैधानिक अनुपालन ट्रैकिंग।",
  "Workers On Site": "कार्यस्थल पर कर्मचारी",
  "Across 3 active shifts": "3 सक्रिय शिफ्टों में",
  "Open Violations": "खुले उल्लंघन",
  "Action Required": "कार्रवाई की आवश्यकता",
  "Compliance Items": "अनुपालन आइटम",
  "Tracked this month": "इस महीने ट्रैक किया गया",
  "Active Contractors": "सक्रिय ठेकेदार",
  "Shift Schedule & Personnel": "शिफ्ट अनुसूची और कर्मी",
  "Shift Foreman": "शिफ्ट फोरमैन",
  "miners": "खनिक",
  "Contractor Manifest": "ठेकेदार सूची",
  "workers": "कर्मचारी",
  "Safety cert expiring soon": "सुरक्षा प्रमाणपत्र जल्द समाप्त हो रहा है",
  "Open Pit Hazards": "खुले खदान खतरे",
  "Colliery Statutory Compliance Tracker": "कोलिरी वैधानिक अनुपालन ट्रैकर",
  "Directive / Requirement": "निर्देश / आवश्यकता",
  "Category": "श्रेणी",
  "Due Date": "नियत तारीख",

  // Corporate HQ Top metrics
  "Total Supervised Sites": "कुल पर्यवेक्षित साइटें",
  "Active telemetry nodes": "सक्रिय टेलीमेट्री नोड्स",
  "Overdue Compliance": "अतिदेय अनुपालन",
  "Escalation triggers active": "वृद्धि ट्रिगर सक्रिय",
  "Global Avg Risk Score": "वैश्विक औसत जोखिम स्कोर",
  "XGBoost weighted mean": "XGBoost भारित औसत",
  "Consolidated Risk-Ranked Subsidiaries": "समेकित जोखिम-रैंक वाली सहायक कंपनियां",
  "Click 'Explain Risk' for SHAP model breakdown": "SHAP मॉडल ब्रेकडाउन के लिए 'जोखिम समझाएं' पर क्लिक करें",
  "Explain Risk (XAI)": "जोखिम समझाएं (XAI)",
  "HQ AI Risk Insights & Predictive Diagnostics": "मुख्यालय एआई जोखिम अंतर्दृष्टि एवं भविष्य कहनेवाला डायग्नोस्टिक्स",
  "XGBoost Diagnostics": "XGBoost डायग्नोस्टिक्स",
  "Recalculate Global Risk Scores": "वैश्विक जोखिम स्कोर की पुनर्गणना करें",
  "Enterprise Live Violations Feed": "एंटरप्राइज लाइव उल्लंघन फ़ीड",
  "Realtime interconnect active": "रीयलटाइम इंटरकनेक्ट सक्रिय",
  "Mine & Subsidiary": "खदान और सहायक",
  "Severity": "गंभीरता",
  "Escalation Status": "वृद्धि की स्थिति",
  "Timestamp": "समय-मोहर",
  "Mine Location": "खदान का स्थान",
  "Risk Index": "जोखिम सूचकांक",
  "Telemetry Bar": "टेलीमेट्री बार",
  "Explainability": "व्याख्यात्मकता",
  "Manage Mine Officials": "खदान अधिकारियों का प्रबंधन करें",
  "Bulk Data Import": "थोक डेटा आयात",
  "Export Compliance Report": "अनुपालन रिपोर्ट निर्यात करें",
  "Live Telemetry Stream: Connected": "लाइव टेलीमेट्री स्ट्रीम: कनेक्टेड",
  "RECENT ACTIVITY:": "हाल की गतिविधि:",
  "National Command": "राष्ट्रीय कमान",
  "Subsidiary Radar": "सहायक रडार"
};

export const AutoTranslator: React.FC = () => {
  const { i18n } = useTranslation();
  const { translateText } = useLanguage();
  const isTranslatingRef = useRef(false);

  const langCode = i18n.language ? i18n.language.split('-')[0].toLowerCase() : 'en';

  useEffect(() => {
    if (langCode === 'en') return;

    const translateNodes = async () => {
      if (isTranslatingRef.current) return;
      isTranslatingRef.current = true;

      try {
        const elements = document.querySelectorAll<HTMLElement>(
          'h1, h2, h3, h4, h5, h6, p, span, button, th, td, label, div.text-xs, div.text-sm'
        );

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          // Skip input elements, code blocks, or SVG elements
          if (el.children.length > 0 && el.querySelectorAll('input, select, textarea, svg, img').length > 0) {
            continue;
          }
          if (el.getAttribute('data-translated') === langCode) continue;

          const directTextNode = Array.from(el.childNodes).find(
            (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim()
          );

          if (directTextNode) {
            const original = directTextNode.nodeValue?.trim() || '';

            // Check manual quick dictionary for instant zero-latency match
            if (langCode === 'hi' && MANUAL_HINDI_MAP[original]) {
              directTextNode.nodeValue = directTextNode.nodeValue!.replace(original, MANUAL_HINDI_MAP[original]);
              el.setAttribute('data-translated', langCode);
            } else if (original.length > 2 && original.length < 150 && /[a-zA-Z]/.test(original)) {
              // Async API translate for unmapped strings
              const translated = await translateText(original, langCode);
              if (translated && translated !== original && directTextNode.nodeValue) {
                directTextNode.nodeValue = directTextNode.nodeValue.replace(original, translated);
                el.setAttribute('data-translated', langCode);
              }
            }
          }
        }
      } catch (err) {
        console.warn('AutoTranslator error:', err);
      } finally {
        isTranslatingRef.current = false;
      }
    };

    // Run immediately and setup observer
    translateNodes();
    const interval = setInterval(translateNodes, 1200);

    return () => {
      clearInterval(interval);
    };
  }, [langCode, translateText]);

  return null;
};

export default AutoTranslator;
