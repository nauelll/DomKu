/* ============================================
   DompetKu — theme.js
   Theme management: light/dark/system + accent color.
   Applies CSS variables on <html>.
   ============================================ */

(function (global) {
  'use strict';

  // All available accent palettes (user can pick in Settings)
  const PALETTES = {
    emerald: { name: 'Emerald', primary: '#10B981', primaryDark: '#059669', primaryLight: '#D1FAE5' },
    blue:    { name: 'Blue',    primary: '#3B82F6', primaryDark: '#2563EB', primaryLight: '#DBEAFE' },
    purple:  { name: 'Purple',  primary: '#8B5CF6', primaryDark: '#7C3AED', primaryLight: '#EDE9FE' },
    rose:    { name: 'Rose',    primary: '#F43F5E', primaryDark: '#E11D48', primaryLight: '#FFE4E6' },
    amber:   { name: 'Amber',   primary: '#F59E0B', primaryDark: '#D97706', primaryLight: '#FEF3C7' },
    cyan:    { name: 'Cyan',    primary: '#06B6D4', primaryDark: '#0891B2', primaryLight: '#CFFAFE' },
    indigo:  { name: 'Indigo',  primary: '#6366F1', primaryDark: '#4F46E5', primaryLight: '#E0E7FF' },
    teal:    { name: 'Teal',    primary: '#14B8A6', primaryDark: '#0D9488', primaryLight: '#CCFBF1' }
  };

  function detectSystemDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(mode) {
    const isDark = mode === 'dark' || (mode === 'system' && detectSystemDark());
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme-mode', mode);
    // Update meta theme-color (for mobile browser UI)
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0B1120' : '#FFFFFF');
    }
  }

  function applyAccent(color) {
    const root = document.documentElement;
    // Try to find a matching palette; fall back to custom (just use color as-is)
    let palette = Object.values(PALETTES).find((p) => p.primary.toLowerCase() === color.toLowerCase());
    if (!palette) {
      palette = { primary: color, primaryDark: color, primaryLight: color + '22' };
    }
    root.style.setProperty('--accent', palette.primary);
    root.style.setProperty('--accent-dark', palette.primaryDark);
    root.style.setProperty('--accent-light', palette.primaryLight);
  }

  const Theme = {
    PALETTES,
    init() {
      const mode = Settings.get('theme') || 'system';
      const accent = Settings.get('accentColor') || '#10B981';
      applyTheme(mode);
      applyAccent(accent);

      // React to system theme changes when in 'system' mode
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (Settings.get('theme') === 'system') applyTheme('system');
      });
    },
    setMode(mode) {
      Settings.set('theme', mode);
      applyTheme(mode);
    },
    setAccent(color) {
      Settings.set('accentColor', color);
      applyAccent(color);
    },
    toggle() {
      const current = Settings.get('theme');
      const isDark = current === 'dark' || (current === 'system' && detectSystemDark());
      this.setMode(isDark ? 'light' : 'dark');
    },
    isDark() {
      const mode = Settings.get('theme');
      return mode === 'dark' || (mode === 'system' && detectSystemDark());
    }
  };

  global.Theme = Theme;
})(window);
