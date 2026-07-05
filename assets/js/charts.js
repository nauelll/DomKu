/* ============================================
   DompetKu — charts.js
   Vanilla canvas chart library.
   Supports: line, bar, doughnut, pie, progress.
   No external dependency. Fully offline.
   ============================================ */

(function (global) {
  'use strict';

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w: rect.width, h: rect.height };
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }
  function textColor() { return isDark() ? '#A1A1AA' : '#525252'; }
  function gridColor() { return isDark() ? '#27272A' : '#E5E5E7'; }
  function axisColor() { return isDark() ? '#3F3F46' : '#D4D4D8'; }

  /* ============== LINE CHART ==============
     data: { labels: [], datasets: [{ label, data: [], color, fill? }] }
  */
  function line(canvas, data, options = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const allValues = data.datasets.flatMap((d) => d.data);
    const maxV = Math.max(...allValues, 0);
    const minV = Math.min(...allValues, 0);
    const range = maxV - minV || 1;

    // Grid lines + Y labels
    ctx.strokeStyle = gridColor();
    ctx.fillStyle = textColor();
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (chartH / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      const value = maxV - (range / gridSteps) * i;
      ctx.textAlign = 'right';
      ctx.fillText(formatShort(value), padding.left - 8, y + 4);
    }

    // X labels
    ctx.textAlign = 'center';
    const stepX = chartW / Math.max((data.labels.length - 1), 1);
    data.labels.forEach((label, i) => {
      if (i % Math.ceil(data.labels.length / 8) === 0 || i === data.labels.length - 1) {
        ctx.fillText(label, padding.left + stepX * i, h - 10);
      }
    });

    // Plot each dataset
    data.datasets.forEach((ds) => {
      ctx.strokeStyle = ds.color || '#10B981';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Fill area
      if (ds.fill) {
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, hexToRgba(ds.color || '#10B981', 0.35));
        gradient.addColorStop(1, hexToRgba(ds.color || '#10B981', 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ds.data.forEach((v, i) => {
          const x = padding.left + stepX * i;
          const y = padding.top + chartH - ((v - minV) / range) * chartH;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.lineTo(padding.left + stepX * (ds.data.length - 1), padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        ctx.fill();
      }

      // Line
      ctx.beginPath();
      ds.data.forEach((v, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartH - ((v - minV) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Points
      ctx.fillStyle = ds.color || '#10B981';
      ds.data.forEach((v, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartH - ((v - minV) / range) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  /* ============== BAR CHART ==============
     data: { labels: [], datasets: [{ label, data: [], color }] } (single or multi)
  */
  function bar(canvas, data, options = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const allValues = data.datasets.flatMap((d) => d.data).concat([0]);
    const maxV = Math.max(...allValues);
    const minV = Math.min(...allValues, 0);
    const range = maxV - minV || 1;

    // Grid
    ctx.strokeStyle = gridColor();
    ctx.fillStyle = textColor();
    ctx.font = '11px system-ui, sans-serif';
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (chartH / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      const value = maxV - (range / gridSteps) * i;
      ctx.textAlign = 'right';
      ctx.fillText(formatShort(value), padding.left - 8, y + 4);
    }

    const dsCount = data.datasets.length;
    const groupW = chartW / data.labels.length;
    const barW = Math.max(4, (groupW * 0.7) / dsCount);
    const xStep = groupW;

    data.labels.forEach((label, i) => {
      const groupX = padding.left + xStep * i + (groupW - barW * dsCount - (dsCount - 1) * 2) / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = textColor();
      ctx.fillText(label, padding.left + xStep * i + groupW / 2, h - 10);

      data.datasets.forEach((ds, di) => {
        const v = ds.data[i] || 0;
        const x = groupX + di * (barW + 2);
        const y = padding.top + chartH - ((v - minV) / range) * chartH;
        const barH = ((v - minV) / range) * chartH;
        ctx.fillStyle = ds.color || ['#10B981','#EF4444','#3B82F6','#F59E0B'][di % 4];
        roundRect(ctx, x, y, barW, barH, 4);
        ctx.fill();
      });
    });
  }

  /* ============== DOUGHNUT / PIE CHART ==============
     data: { labels: [], data: [], colors: [] }
  */
  function doughnut(canvas, data, options = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 20;
    const inner = options.donut === false ? 0 : radius * 0.6;
    const total = data.data.reduce((s, v) => s + v, 0) || 1;
    let start = -Math.PI / 2;

    data.data.forEach((value, i) => {
      const angle = (value / total) * Math.PI * 2;
      const color = data.colors[i] || Utils.colorFromString(data.labels[i] || 'x');
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(start) * inner, cy + Math.sin(start) * inner);
      ctx.arc(cx, cy, radius, start, start + angle);
      if (inner > 0) ctx.arc(cx, cy, inner, start + angle, start, true);
      else ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      start += angle;
    });

    // Center label for doughnut
    if (inner > 0 && options.centerLabel) {
      ctx.fillStyle = textColor();
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px system-ui';
      ctx.fillText(options.centerLabel, cx, cy - 4);
      if (options.centerSub) {
        ctx.font = '11px system-ui';
        ctx.fillText(options.centerSub, cx, cy + 14);
      }
    }
  }

  /* ============== PROGRESS BAR ==============
     Renders a horizontal progress bar (0–100%).
  */
  function progress(container, percent, options = {}) {
    const { color = '#10B981', trackColor = null, height = 8 } = options;
    container.innerHTML = `
      <div class="progress-track" style="height:${height}px;background:${trackColor || (isDark() ? '#27272A' : '#E5E5E7')}">
        <div class="progress-fill" style="width:${Math.min(100, Math.max(0, percent))}%;background:${color}"></div>
      </div>`;
  }

  /* ---------- helpers ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    if (h < 0) { y += h; h = -h; }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function hexToRgba(hex, alpha) {
    const m = hex.replace('#', '').match(/.{2}/g);
    if (!m) return hex;
    const [r, g, b] = m.map((x) => parseInt(x, 16));
    return `rgba(${r},${g},${b},${alpha})`;
  }
  function formatShort(n) {
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'k';
    return String(Math.round(n));
  }

  /* ---------- Auto-redraw on theme change ---------- */
  // Charts should be re-rendered by caller when theme changes.
  // We expose an "observe" helper that re-renders on theme change.
  function observe(canvas, renderFn) {
    const observer = new MutationObserver(() => renderFn());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }

  global.Charts = { line, bar, doughnut, progress, observe };
})(window);
