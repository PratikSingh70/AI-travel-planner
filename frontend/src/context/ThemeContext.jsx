import { createContext, useContext, useMemo } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Theme is permanently locked to light mode.
  // The toggle and dark logic have been removed.
  const value = useMemo(
    () => ({
      theme: "light",
      isDark: false,
      dark: false,
      toggleTheme: () => {},
      setDark: () => {},
    }),
    []
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
};

export default ThemeContext;