import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

interface ThemeToggleProps {
  /** 'topbar' = compact icon-only button, 'landing' = slightly larger with ring */
  variant?: 'topbar' | 'landing' | 'floating';
}

export default function ThemeToggle({ variant = 'topbar' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (animating) return;
    setAnimating(true);
    toggleTheme();
    setTimeout(() => setAnimating(false), 300);
  };

  const isDark = theme === 'dark';

  const baseClass = `
    relative inline-flex items-center justify-center
    rounded-lg border transition-all duration-200
    select-none cursor-pointer
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
  `;

  const variantClass =
    variant === 'topbar'
      ? `w-8 h-8 border-[var(--cg-border)] bg-[var(--cg-surface-elevated)] hover:bg-[var(--cg-surface-high)] focus-visible:ring-[var(--cg-accent)]`
      : variant === 'landing'
      ? `w-9 h-9 border-[var(--cg-border-strong)] bg-[var(--cg-surface-elevated)] hover:bg-[var(--cg-surface-high)] focus-visible:ring-[var(--cg-accent)]`
      : `w-10 h-10 border-[var(--cg-border-strong)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-lg)] hover:bg-[var(--cg-surface-elevated)] focus-visible:ring-[var(--cg-accent)]`;

  const iconSize = variant === 'floating' ? 'w-4.5 h-4.5' : 'w-3.5 h-3.5';

  return (
    <button
      onClick={handleClick}
      className={`${baseClass} ${variantClass}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      type="button"
    >
      {/* Sun icon - shown in dark mode (click to go light) */}
      <span
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 200ms ease, transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          opacity: isDark ? 1 : 0,
          transform: isDark
            ? 'rotate(0deg) scale(1)'
            : 'rotate(90deg) scale(0.5)',
        }}
      >
        <Sun
          className={`${iconSize} text-[var(--cg-toggle-icon)] hover:text-[var(--cg-accent)]`}
          strokeWidth={2}
        />
      </span>

      {/* Moon icon - shown in light mode (click to go dark) */}
      <span
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 200ms ease, transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          opacity: isDark ? 0 : 1,
          transform: isDark
            ? 'rotate(-90deg) scale(0.5)'
            : 'rotate(0deg) scale(1)',
        }}
      >
        <Moon
          className={`${iconSize} text-[var(--cg-toggle-icon)] hover:text-[var(--cg-accent)]`}
          strokeWidth={2}
        />
      </span>
    </button>
  );
}
