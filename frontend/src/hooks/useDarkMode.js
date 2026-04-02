import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedPrefs = window.localStorage.getItem('pharmaguard-theme');
      if (typeof storedPrefs === 'string') {
        return storedPrefs;
      }
      
      // Auto-switch based on time
      const hour = new Date().getHours();
      let defaultTheme = 'light';
      // Between 7 PM (19) and 6 AM (6) -> dark mode
      if (hour >= 19 || hour < 6) {
        defaultTheme = 'dark';
        setTimeout(() => console.log('Switched to Dark Mode (based on your local time)'), 100);
      }
      return defaultTheme;
    }
    
    return 'light'; // light theme as default
  });

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    localStorage.setItem('pharmaguard-theme', theme);
  }, [theme]);

  // Handle system preference changes if no manual override
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const storedPrefs = window.localStorage.getItem('pharmaguard-theme');
      if (!storedPrefs) {
         setTheme(e.matches ? 'dark' : 'light');
      }
    };
    // older browsers compatibility
    if (mediaQuery.addEventListener) {
       mediaQuery.addEventListener('change', handleChange);
       return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  return { isDark: theme === 'dark', toggleTheme, theme };
};

export default useDarkMode;
