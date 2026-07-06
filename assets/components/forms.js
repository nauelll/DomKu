/* ============================================
   DompetKu — forms.js
   Reusable form helpers: input, select, textarea,
   amount input with currency formatting, date picker, etc.
   ============================================ */

(function (global) {
  'use strict';

  const Forms = {
    /** Build a labeled text input. */
    text(label, opts = {}) {
      const { id, value = '', placeholder = '', type = 'text', required = false } = opts;
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      wrap.innerHTML = `
        <label for="${id}">${label}${required ? ' <span class="req">*</span>' : ''}</label>
        <input id="${id}" name="${id}" type="${type}" value="${Utils.escapeHtml(String(value))}" placeholder="${Utils.escapeHtml(placeholder)}" ${required ? 'required' : ''}>`;
      return wrap;
    },

    /** Amount input with currency formatting (Indonesian: dots as thousand separators). */
    amount(label, opts = {}) {
      const { id, value = 0, required = false, currency = 'IDR' } = opts;
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      // Format initial value: number → "13.844.000" or empty if 0
      const initialValue = value ? Utils.formatAmount(value) : '';
      wrap.innerHTML = `
        <label for="${id}">${label}${required ? ' <span class="req">*</span>' : ''}</label>
        <div class="amount-input">
          <span class="amount-prefix">Rp</span>
          <input id="${id}" name="${id}" type="text" inputmode="numeric" value="${Utils.escapeHtml(initialValue)}" placeholder="0" autocomplete="off" ${required ? 'required' : ''}>
        </div>`;
      const input = wrap.querySelector('input');

      /**
       * Core formatting function — pure, no side effects.
       * Returns { value, cursorPos } or null on failure.
       */
      function formatValue(rawValue, cursorPos) {
        try {
          // Count digits BEFORE cursor in the raw (pre-format) value
          const digitsBeforeCursor = (rawValue.slice(0, cursorPos).match(/\d/g) || []).length;

          // Parse to a pure number (Indonesian-aware)
          const num = Utils.parseNumber(rawValue);
          const newValue = num > 0 ? Utils.formatAmount(num) : '';

          // If new value is empty, cursor goes to 0
          if (!newValue) return { value: '', cursorPos: 0 };

          // Walk through newValue, count digits, stop when we reach digitsBeforeCursor
          let digitCount = 0;
          let newCursorPos = newValue.length; // default: end
          for (let i = 0; i < newValue.length; i++) {
            if (/\d/.test(newValue[i])) {
              digitCount++;
              if (digitCount === digitsBeforeCursor) {
                newCursorPos = i + 1;
                break;
              }
            }
          }
          // If cursor was after all digits (e.g. user typed at the end), place at end
          if (digitCount < digitsBeforeCursor) {
            newCursorPos = newValue.length;
          }
          return { value: newValue, cursorPos: newCursorPos };
        } catch (err) {
          // Fallback: keep raw value, don't crash the input
          console.warn('formatValue error:', err);
          return { value: rawValue, cursorPos: rawValue.length };
        }
      }

      /**
       * Handle input event: format value + restore cursor.
       * Uses requestAnimationFrame for reliable cursor positioning across browsers.
       */
      function formatInput() {
        const cursorPos = input.selectionStart || 0;
        const oldValue = input.value;
        const result = formatValue(oldValue, cursorPos);

        // Always update value (even if same, to ensure consistency)
        input.value = result.value;

        // Restore cursor on next frame (more reliable than synchronous setSelectionRange)
        requestAnimationFrame(() => {
          try {
            input.setSelectionRange(result.cursorPos, result.cursorPos);
          } catch (e) { /* ignore */ }
        });
      }

      input.addEventListener('input', formatInput);

      // Block non-numeric keystrokes (allow: digits, Backspace, Delete, Tab, Arrow keys, Ctrl+A/C/V/X)
      input.addEventListener('keydown', (e) => {
        const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
        if (allowed.includes(e.key)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return; // allow copy/paste/cut
        if (/^\d$/.test(e.key)) return; // digits
        // Block everything else (letters, symbols, etc.)
        e.preventDefault();
      });

      // Handle paste: clean and reformat
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const num = Utils.parseNumber(text);
        input.value = num > 0 ? Utils.formatAmount(num) : '';
        // Place cursor at end after paste
        requestAnimationFrame(() => {
          const len = input.value.length;
          try { input.setSelectionRange(len, len); } catch (e) { /* ignore */ }
        });
      });

      // Handle focus: select all on click (optional UX improvement)
      // (commented out — let user place cursor wherever they want)
      // input.addEventListener('focus', () => input.select());

      return wrap;
    },

    /** Returns numeric value of amount input. */
    amountValue(wrapOrInput) {
      const input = wrapOrInput.tagName === 'INPUT' ? wrapOrInput : wrapOrInput.querySelector('input');
      return Utils.parseNumber(input.value);
    },

    /** Select dropdown. */
    select(label, opts = {}) {
      const { id, value = '', options = [], required = false } = opts;
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      wrap.innerHTML = `
        <label for="${id}">${label}${required ? ' <span class="req">*</span>' : ''}</label>
        <select id="${id}" name="${id}" ${required ? 'required' : ''}>
          ${options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : o.label;
            return `<option value="${Utils.escapeHtml(v)}" ${v === value ? 'selected' : ''}>${Utils.escapeHtml(l)}</option>`;
          }).join('')}
        </select>`;
      return wrap;
    },

    /** Textarea. */
    textarea(label, opts = {}) {
      const { id, value = '', placeholder = '', rows = 3 } = opts;
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      wrap.innerHTML = `
        <label for="${id}">${label}</label>
        <textarea id="${id}" name="${id}" rows="${rows}" placeholder="${Utils.escapeHtml(placeholder)}">${Utils.escapeHtml(value)}</textarea>`;
      return wrap;
    },

    /** Date input (returns ISO date). */
    date(label, opts = {}) {
      const { id, value = Utils.todayISO(), required = false } = opts;
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      wrap.innerHTML = `
        <label for="${id}">${label}${required ? ' <span class="req">*</span>' : ''}</label>
        <input id="${id}" name="${id}" type="date" value="${value}" ${required ? 'required' : ''}>`;
      return wrap;
    },

    /** Time input (HH:MM). */
    time(label, opts = {}) {
      const { id, value = new Date().toTimeString().slice(0, 5), required = false } = opts;
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      wrap.innerHTML = `
        <label for="${id}">${label}</label>
        <input id="${id}" name="${id}" type="time" value="${value}" ${required ? 'required' : ''}>`;
      return wrap;
    },

    /** File picker for image attachment. */
    imageUpload(label, opts = {}) {
      const { id, existing = null } = opts;
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      wrap.innerHTML = `
        <label>${label}</label>
        <div class="image-upload" data-upload="${id}">
          <div class="image-preview">${existing ? `<img src="${existing}" alt="preview">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'}</div>
          <div class="image-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-act="pick">Pilih Gambar</button>
            ${existing ? '<button type="button" class="btn btn-ghost btn-sm" data-act="remove">Hapus</button>' : ''}
          </div>
          <input type="file" accept="image/*" hidden>
          <input type="hidden" name="${id}" data-value="${existing || ''}">
        </div>`;
      const pickBtn = wrap.querySelector('[data-act="pick"]');
      const fileInput = wrap.querySelector('input[type="file"]');
      const preview = wrap.querySelector('.image-preview');
      const hidden = wrap.querySelector('input[type="hidden"]');

      pickBtn.onclick = () => fileInput.click();
      fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;
        const compressed = await Utils.compressImage(file, 800, 0.7);
        preview.innerHTML = `<img src="${compressed}" alt="preview">`;
        hidden.value = compressed;
        hidden.setAttribute('data-value', compressed);
        if (!wrap.querySelector('[data-act="remove"]')) {
          const rm = document.createElement('button');
          rm.type = 'button';
          rm.className = 'btn btn-ghost btn-sm';
          rm.dataset.act = 'remove';
          rm.textContent = 'Hapus';
          rm.onclick = () => {
            preview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
            hidden.value = '';
            hidden.setAttribute('data-value', '');
            rm.remove();
          };
          wrap.querySelector('.image-actions').appendChild(rm);
        }
      };
      const rmBtn = wrap.querySelector('[data-act="remove"]');
      if (rmBtn) {
        rmBtn.onclick = () => {
          preview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
          hidden.value = '';
          hidden.setAttribute('data-value', '');
          rmBtn.remove();
        };
      }
      return wrap;
    },

    /** Collect all form values into a plain object. */
    collect(formEl) {
      const data = {};
      formEl.querySelectorAll('input, select, textarea').forEach((field) => {
        if (!field.name) return;
        if (field.type === 'file') return; // handled by imageUpload
        data[field.name] = field.value;
      });
      return data;
    },

    /** Two-column row helper. */
    row(...fields) {
      const row = document.createElement('div');
      row.className = 'form-row';
      fields.forEach((f) => row.appendChild(f));
      return row;
    }
  };

  global.Forms = Forms;
})(window);
