import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'theme';

function getInitialTheme(): Theme {
   const saved = localStorage.getItem(KEY);
   if (saved === 'light' || saved === 'dark') return saved;
   return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
}

export function useTheme() {
   const [theme, setTheme] = useState<Theme>(getInitialTheme);

   useEffect(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem(KEY, theme);
   }, [theme]);

   return {
      theme,
      toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
   };
}
