import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../supabase";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // If opening landing page, always start in dark theme
    const isLanding = typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "");
    if (isLanding) return "dark";

    // Read from localStorage, default to "light" for authenticated / portal pages
    const saved = localStorage.getItem("coalguard-theme");
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });

  // Whenever a user logs in (or a new session begins upon sign-in), always default to light theme
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setTheme("light");
        localStorage.setItem("coalguard-theme", "light");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Apply theme via data-theme attribute AND class on <html> so both CSS vars and Tailwind dark: variants work
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("coalguard-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

