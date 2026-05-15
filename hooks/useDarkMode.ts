"use client";

import { useEffect, useState } from "react";

function getInitialDarkMode() {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem("nei-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return stored !== null ? stored === "dark" : prefersDark;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("nei-theme", next ? "dark" : "light");
      return next;
    });
  };

  return { isDark, toggle };
}
