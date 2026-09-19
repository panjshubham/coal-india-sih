import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  translateText: (text: string, targetLang?: string) => Promise<string>;
  isTranslating: boolean;
}

const translationCache: Record<string, string> = {};

const LANG_MAP: Record<string, string> = {
  'en': 'en',
  'hi': 'hi',
  'bn': 'bn',
  'te': 'te',
  'mr': 'mr',
  'or': 'or',
  'ta': 'ta',
  'gu': 'gu',
  'pa': 'pa'
};

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'en',
  setLanguage: () => {},
  translateText: async (t) => t,
  isTranslating: false,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguageState] = useState<string>(
    i18n.language ? i18n.language.split('-')[0].toLowerCase() : 'en'
  );
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  useEffect(() => {
    const handleLangChange = (e: CustomEvent) => {
      if (e.detail?.language) {
        setCurrentLanguageState(e.detail.language);
      }
    };
    window.addEventListener('coalguard:languageChanged', handleLangChange as EventListener);
    return () => {
      window.removeEventListener('coalguard:languageChanged', handleLangChange as EventListener);
    };
  }, []);

  const setLanguage = (lang: string) => {
    const target = lang.toLowerCase();
    i18n.changeLanguage(target);
    try {
      localStorage.setItem('i18nextLng', target);
    } catch (e) {
      console.warn('localStorage error', e);
    }
    setCurrentLanguageState(target);
    window.dispatchEvent(new CustomEvent('coalguard:languageChanged', { detail: { language: target } }));
  };

  const translateText = async (text: string, targetLang?: string): Promise<string> => {
    const clean = text ? text.trim() : '';
    if (!clean) return '';

    const lang = (targetLang || currentLanguage).toLowerCase();
    if (lang === 'en') return clean;

    const cacheKey = `${lang}:${clean}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }

    const targetCode = LANG_MAP[lang] || 'hi';

    try {
      setIsTranslating(true);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(clean)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translated = data[0].map((chunk: any) => chunk[0]).filter(Boolean).join('');
          if (translated && translated.trim()) {
            translationCache[cacheKey] = translated.trim();
            return translated.trim();
          }
        }
      }
    } catch (err) {
      console.warn('Google Translate error:', err);
    } finally {
      setIsTranslating(false);
    }

    return clean;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, translateText, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
