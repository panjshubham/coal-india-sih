import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Read from localStorage, default to "dark" if nothing saved
    const saved = localStorage.getItem("coalguard-theme");
    if (saved === "light" || saved === "dark") return saved;
    return "dark"; // Never follow system preference — always default dark
  });

  useEffect(() => {
    // Apply theme via data-theme attribute on <html> so CSS variables cascade globally
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("coalguard-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
