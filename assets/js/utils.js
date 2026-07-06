/* ============================================
   DompetKu — utils.js
   Formatters (currency/date/number), DOM helpers,
   debounce, download, file picker, etc.
   ============================================ */

(function (global) {
  'use strict';

  const Utils = {
    /* ---------- ID / DOM ---------- */
    $(sel, root = document) { return root.querySelector(sel); },
    $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },
    el(tag, attrs = {}, ...children) {
      const node = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v !== null && v !== undefined) node.setAttribute(k, v);
      });
      children.flat().forEach((c) => {
        if (c == null) return;
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else node.appendChild(c);
      });
      return node;
    },
    empty(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; },

    /* ---------- Currency & number ---------- */
    formatCurrency(amount, currency = 'IDR', locale = 'id-ID') {
      const n = Number(amount) || 0;
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(n);
      } catch (e) {
        return 'Rp ' + n.toLocaleString('id-ID');
      }
    },
    formatNumber(n, locale = 'id-ID') {
      return (Number(n) || 0).toLocaleString(locale);
    },
    /**
     * Format angka untuk tampilan input nominal (Indonesian: dot as thousand separator).
     * Returns empty string for 0 so the input appears empty when cleared.
     * Example: 13844000 → "13.844.000"
     * Defensive: never throws, always returns a string.
     */
    formatAmount(n) {
      try {
        const num = Number(n);
        if (!isFinite(num) || num === 0) return '';
        // Use Intl.NumberFormat for proper Indonesian formatting
        return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num);
      } catch (e) {
        // Fallback: manual formatting with dots
        const num = Number(n) || 0;
        if (!isFinite(num) || num === 0) return '';
        const parts = Math.abs(num).toFixed(0).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return (num < 0 ? '-' : '') + parts.join(',');
      }
    },
    /** Compact format: 1840 → "1.8k", 1250000 → "1.3M" */
    formatShort(n) {
      n = Number(n) || 0;
      const abs = Math.abs(n);
      if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
      if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
      if (abs >= 1e3) return (n / 1e3).toFixed(0) + 'k';
      return String(Math.round(n));
    },
    /**
     * Parse string to number — Indonesian format aware.
     * Indonesian: dots (.) are thousand separators, comma (,) is decimal.
     * Examples:
     *   "13.844.000"  → 13844000
     *   "1.250.000"   → 1250000
     *   "250.000"     → 250000
     *   "15.500"      → 15500
     *   "13.844.000,50" → 13844000.5  (with decimal)
     *   "abc 12.000"  → 12000  (letters ignored)
     *   ""            → 0
     *   1234 (number) → 1234 (passthrough)
     */
    parseNumber(str) {
      if (typeof str === 'number') return isFinite(str) ? str : 0;
      if (str == null) return 0;
      let s = String(str).trim();
      if (!s) return 0;
      // Indonesian: remove all dots (thousand separators), convert comma to dot (decimal)
      s = s.replace(/\./g, '').replace(/,/g, '.');
      // Strip anything that's not digit, dot, or minus
      s = s.replace(/[^0-9.-]/g, '');
      // Keep only the last dot (in case of "12.34.56" → treat as thousand → "123456")
      const parts = s.split('.');
      if (parts.length > 2) {
        // Multiple dots — treat all but possibly last as thousand separators
        // If last part is exactly 3 digits, treat all as thousand separators → integer
        // Otherwise, treat all as thousand separators → integer
        s = parts.join('');
      }
      const n = Number(s);
      return isFinite(n) ? n : 0;
    },
    formatPercent(value, digits = 1) {
      return (Number(value) || 0).toFixed(digits) + '%';
    },

    /* ---------- Date / time ---------- */
    todayISO() {
      const d = new Date();
      const tz = d.getTimezoneOffset() * 60000;
      return new Date(d - tz).toISOString().slice(0, 10);
    },
    nowISO() { return new Date().toISOString(); },
    formatDate(iso, format = 'DD/MM/YYYY') {
      if (!iso) return '-';
      const d = new Date(iso);
      if (isNaN(d)) return '-';
      const DD = String(d.getDate()).padStart(2, '0');
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const YYYY = d.getFullYear();
      const yy = String(YYYY).slice(2);
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const monthsFull = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
      if (format === 'DD/MM/YYYY') return `${DD}/${MM}/${YYYY}`;
      if (format === 'MM/DD/YYYY') return `${MM}/${DD}/${YYYY}`;
      if (format === 'YYYY-MM-DD') return `${YYYY}-${MM}-${DD}`;
      if (format === 'DD MMM YYYY') return `${DD} ${months[d.getMonth()]} ${YYYY}`;
      if (format === 'DD MMMM YYYY') return `${DD} ${monthsFull[d.getMonth()]} ${YYYY}`;
      if (format === 'DD/MM/YY') return `${DD}/${MM}/${yy}`;
      return `${DD}/${MM}/${YYYY}`;
    },
    formatTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d)) return '';
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    },
    formatDateTime(iso, fmt = 'DD/MM/YYYY') {
      return Utils.formatDate(iso, fmt) + ' ' + Utils.formatTime(iso);
    },
    /** Returns YYYY-MM for given date (or today). */
    monthKey(iso) {
      const d = iso ? new Date(iso) : new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
    /** First and last day of month (ISO date strings). */
    monthRange(monthKeyStr) {
      const [y, m] = monthKeyStr.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10)
      };
    },
    isSameMonth(iso, monthKeyStr) {
      return Utils.monthKey(iso) === monthKeyStr;
    },
    daysUntil(iso) {
      if (!iso) return null;
      const d = new Date(iso);
      const now = new Date();
      const ms = d.setHours(0,0,0,0) - now.setHours(0,0,0,0);
      return Math.ceil(ms / 86400000);
    },

    /* ---------- Misc ---------- */
    debounce(fn, delay = 250) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
      };
    },
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    /** Trigger a browser download for any blob/string. */
    download(filename, content, mime = 'text/plain') {
      const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    },
    /** Open file picker. Returns array of File objects. */
    pickFile(accept = '*/*', multiple = false) {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = multiple;
        input.onchange = () => resolve(input.files ? Array.from(input.files) : []);
        input.click();
      });
    },
    /** Read a File as text. */
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsText(file);
      });
    },
    /** Read a File as DataURL (base64) — for storing images. */
    readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
    },
    /** Compress an image File using canvas; returns JPEG dataURL. */
    async compressImage(file, maxSize = 800, quality = 0.7) {
      const dataUrl = await Utils.readFileAsDataURL(file);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
            else { width = Math.round(width * maxSize / height); height = maxSize; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    },
    /** Escape HTML. */
    escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },
    /** Promise-based delay. */
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    /** Generate a vibrant color from a string (for category charts). */
    colorFromString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
      const h = Math.abs(hash) % 360;
      return `hsl(${h}, 65%, 55%)`;
    },
    /** Group array by key. */
    groupBy(arr, keyFn) {
      return arr.reduce((acc, item) => {
        const k = keyFn(item);
        (acc[k] = acc[k] || []).push(item);
        return acc;
      }, {});
    },
    /** Sum numeric field. */
    sumBy(arr, fn) {
      return arr.reduce((s, x) => s + (Number(fn(x)) || 0), 0);
    }
  };

  global.Utils = Utils;
})(window);
