/* ============================================
   DompetKu — import.js
   Import transactions from CSV or JSON.
   ============================================ */

(function (global) {
  'use strict';

  const Importer = {
    async import() {
      const files = await Utils.pickFile('.csv,.json,application/json,text/csv', false);
      if (!files.length) return;
      const file = files[0];
      try {
        const text = await Utils.readFileAsText(file);
        if (file.name.endsWith('.json')) await this.importJSON(text);
        else if (file.name.endsWith('.csv')) await this.importCSV(text);
        else Toast.error('Format tidak dikenali. Gunakan CSV atau JSON.');
      } catch (e) {
        console.error(e);
        Toast.error('Gagal import: ' + e.message);
      }
    },

    async importJSON(text) {
      const payload = JSON.parse(text);
      // Support both single-store transaction files and full backup
      let txs = [];
      if (Array.isArray(payload)) txs = payload;
      else if (payload.type === 'transactions' && Array.isArray(payload.data)) txs = payload.data;
      else if (payload.data && payload.data.transactions) txs = payload.data.transactions;
      if (!txs.length) return Toast.warning('Tidak ada transaksi ditemukan dalam file JSON');

      // Validate & normalize
      const cats = await DB.getAll('categories');
      const normalized = txs.map((t) => normalizeTx(t, cats)).filter(Boolean);
      if (!normalized.length) return Toast.error('Tidak ada transaksi valid');

      if (await Modal.confirm(`Import ${normalized.length} transaksi? Data existing tidak akan ditimpa.`, { okText: 'Import' })) {
        await DB.bulkPut('transactions', normalized);
        Toast.success(`${normalized.length} transaksi diimport`);
        Router.go('transactions');
      }
    },

    async importCSV(text) {
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const rows = parseCSV(text);
      if (!rows.length) return Toast.error('CSV kosong');

      // Detect header
      const header = rows[0].map((h) => h.toLowerCase().trim());
      const hasHeader = header.some((h) => ['tanggal', 'date', 'jenis', 'type', 'kategori', 'nominal', 'amount'].includes(h));
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const cats = await DB.getAll('categories');

      const txs = dataRows.map((row) => {
        // Try to map by header position
        const obj = {};
        if (hasHeader) {
          header.forEach((h, i) => obj[h] = row[i]);
        } else {
          // Assume order: date, time, type, category, source, amount, note
          [obj.tanggal, obj.jam, obj.jenis, obj.kategori, obj.sumber, obj.nominal, obj.catatan] = row;
        }
        return normalizeCsvRow(obj, cats);
      }).filter(Boolean);

      if (!txs.length) return Toast.error('Tidak ada transaksi valid di CSV');
      if (await Modal.confirm(`Import ${txs.length} transaksi dari CSV?`, { okText: 'Import' })) {
        await DB.bulkPut('transactions', txs);
        Toast.success(`${txs.length} transaksi diimport`);
        Router.go('transactions');
      }
    }
  };

  function normalizeTx(t, cats) {
    if (!t || !t.amount) return null;
    const type = t.type === 'income' || t.type === 'expense' ? t.type : (t.amount > 0 ? 'income' : 'expense');
    let category = t.category;
    let categoryName = t.categoryName;
    if (!category && categoryName) {
      const found = cats.find((c) => c.name === categoryName && c.type === type);
      category = found?.id || (type === 'income' ? 'inc-other' : 'exp-other');
    }
    return {
      id: t.id || DB.uid(),
      type,
      amount: Math.abs(Number(t.amount)) || 0,
      date: t.date || Utils.todayISO(),
      time: t.time || '',
      category: category || (type === 'income' ? 'inc-other' : 'exp-other'),
      categoryName: categoryName || cats.find((c) => c.id === category)?.name || '',
      source: t.source || '',
      method: t.method || '',
      note: t.note || '',
      attachmentId: t.attachmentId || null,
      createdAt: t.createdAt || new Date().toISOString()
    };
  }

  function normalizeCsvRow(o, cats) {
    if (!o) return null;
    const typeRaw = (o.jenis || o.type || '').toLowerCase();
    const type = typeRaw.includes('pemasukan') || typeRaw === 'income' ? 'income' :
                 typeRaw.includes('pengeluaran') || typeRaw === 'expense' ? 'expense' :
                 (Number(o.nominal || o.amount) > 0 ? 'income' : 'expense');
    const amount = Math.abs(Utils.parseNumber(o.nominal || o.amount));
    if (!amount) return null;
    const categoryName = o.kategori || o.category || '';
    const found = cats.find((c) => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === type);
    const category = found?.id || (type === 'income' ? 'inc-other' : 'exp-other');
    return {
      id: DB.uid(),
      type, amount,
      date: parseDate(o.tanggal || o.date) || Utils.todayISO(),
      time: o.jam || o.time || '',
      category, categoryName: categoryName || found?.name || '',
      source: o.sumber || o.source || '',
      note: o.catatan || o.note || '',
      attachmentId: null,
      createdAt: new Date().toISOString()
    };
  }

  function parseDate(s) {
    if (!s) return '';
    // Try DD/MM/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    // Try YYYY-MM-DD
    const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
    return '';
  }

  function parseCSV(text) {
    // Simple CSV parser supporting quoted fields
    const rows = [];
    let row = [], field = '', inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (inQuote) {
        if (c === '"' && next === '"') { field += '"'; i++; }
        else if (c === '"') inQuote = false;
        else field += c;
      } else {
        if (c === '"') inQuote = true;
        else if (c === ',' || c === ';') { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
          if (field || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
          if (c === '\r' && next === '\n') i++;
        } else field += c;
      }
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  global.Importer = Importer;
})(window);
