import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check, ChevronDown } from 'lucide-react';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

interface LanguageSelectorProps {
  variant?: 'topbar' | 'compact' | 'landing';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'topbar', className = '' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = i18n.language ? i18n.language.split('-')[0].toLowerCase() : 'en';
  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem('i18nextLng', code);
    } catch (e) {
      console.warn('Could not save language setting to localStorage:', e);
    }
    window.dispatchEvent(new CustomEvent('coalguard:languageChanged', { detail: { language: code } }));
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger button — theme-aware for all variants */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
        style={{
          backgroundColor: 'var(--cg-surface-elevated)',
          border: '1px solid var(--cg-border-strong)',
          color: 'var(--cg-text-secondary)',
        }}
        title="Select Language / भाषा चुनें"
        aria-expanded={isOpen}
      >
        <Languages className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="font-medium truncate">{currentLanguage.nativeName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 opacity-75 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel — fully theme-aware */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl z-9999 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: 'var(--cg-surface)',
            border: '1px solid var(--cg-border-strong)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase flex items-center justify-between"
            style={{
              color: 'var(--cg-accent)',
              borderBottom: '1px solid var(--cg-border)',
            }}
          >
            <span>Select Language</span>
            <Languages className="w-3 h-3" style={{ color: 'var(--cg-accent)' }} />
          </div>

          {/* Language list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang.code === currentLangCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className="w-full px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer text-left"
                  style={{
                    backgroundColor: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                    color: isActive ? 'var(--cg-accent)' : 'var(--cg-text-secondary)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cg-surface-elevated)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">{lang.flag}</span>
                    <div className="flex flex-col leading-tight truncate">
                      <span className="font-semibold text-xs">{lang.nativeName}</span>
                      <span className="text-[10px]" style={{ color: 'var(--cg-text-faint)' }}>{lang.name}</span>
                    </div>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cg-accent)' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
