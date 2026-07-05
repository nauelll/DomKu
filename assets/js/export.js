/* ============================================
   DompetKu — export.js
   Export transactions to CSV, JSON, XLSX (SpreadsheetML), PDF (print).
   No external library — pure vanilla.
   ============================================ */

(function (global) {
  'use strict';

  const Exporter = {
    /**
     * Export transactions in the given format.
     * @param {Array} transactions
     * @param {'csv'|'json'|'xlsx'|'pdf'} format
     * @param {object} range { from, to }
     */
    async exportTransactions(transactions, format, range = {}) {
      if (!transactions.length) {
        Toast.warning('Tidak ada transaksi untuk diexport');
        return;
      }
      // Sort by date desc
      const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
      const filename = `dompetku-transaksi-${range.from || 'all'}-${range.to || ''}`.replace(/-+$/, '');

      if (format === 'csv') return this.toCSV(sorted, filename);
      if (format === 'json') return this.toJSON(sorted, filename);
      if (format === 'xlsx') return this.toXLSX(sorted, filename);
      if (format === 'pdf') return this.toPDF(sorted, range);
    },

    toCSV(txs, filename) {
      const headers = ['Tanggal', 'Jam', 'Jenis', 'Kategori', 'Sumber/Metode', 'Nominal', 'Catatan'];
      const rows = txs.map((t) => [
        t.date, t.time || '', t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        t.categoryName || '', t.source || '', t.amount, (t.note || '').replace(/[\n\r,]/g, ' ')
      ]);
      const csv = [headers, ...rows].map((row) =>
        row.map((cell) => {
          const s = String(cell);
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
      ).join('\n');
      // BOM for Excel UTF-8 detection
      Utils.download(`${filename}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
      Toast.success('CSV diexport');
    },

    toJSON(txs, filename) {
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        type: 'transactions',
        count: txs.length,
        data: txs
      };
      Utils.download(`${filename}.json`, JSON.stringify(payload, null, 2), 'application/json');
      Toast.success('JSON diexport');
    },

    toXLSX(txs, filename) {
      // SpreadsheetML 2003 XML format — opens natively in Excel/LibreOffice
      const rows = txs.map((t, i) => `
        <Row>
          <Cell><Data ss:Type="String">${escapeXml(t.date)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(t.time || '')}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(t.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(t.categoryName || '')}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(t.source || '')}</Data></Cell>
          <Cell><Data ss:Type="Number">${t.amount}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(t.note || '')}</Data></Cell>
        </Row>`).join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Transaksi">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Tanggal</Data></Cell>
        <Cell><Data ss:Type="String">Jam</Data></Cell>
        <Cell><Data ss:Type="String">Jenis</Data></Cell>
        <Cell><Data ss:Type="String">Kategori</Data></Cell>
        <Cell><Data ss:Type="String">Sumber/Metode</Data></Cell>
        <Cell><Data ss:Type="String">Nominal</Data></Cell>
        <Cell><Data ss:Type="String">Catatan</Data></Cell>
      </Row>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`;
      Utils.download(`${filename}.xls`, xml, 'application/vnd.ms-excel');
      Toast.success('Excel diexport');
    },

    toPDF(txs, range) {
      // Use browser's print to PDF: open a styled print window
      const win = window.open('', '_blank');
      if (!win) { Toast.error('Popup diblokir. Izinkan popup untuk export PDF.'); return; }
      const totalIn = Utils.sumBy(txs.filter((t) => t.type === 'income'), (t) => t.amount);
      const totalOut = Utils.sumBy(txs.filter((t) => t.type === 'expense'), (t) => t.amount);
      win.document.write(`
        <!DOCTYPE html><html><head><title>Laporan DompetKu</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #0A0A0A; }
          h1 { color: #10B981; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f3f4f6; }
          .income { color: #16a34a; } .expense { color: #dc2626; }
          .summary { display: flex; gap: 24px; margin: 16px 0; }
          .summary div { padding: 8px 16px; border-radius: 8px; background: #f3f4f6; }
          @media print { button { display: none; } }
        </style></head><body>
          <h1>Laporan Transaksi DompetKu</h1>
          <p>Periode: ${range.from || 'Awal'} s/d ${range.to || 'Akhir'}</p>
          <p>Diexport: ${Utils.formatDateTime(new Date().toISOString())}</p>
          <div class="summary">
            <div><strong>Total Pemasukan:</strong><br>${Utils.formatCurrency(totalIn, Settings.get('currency'))}</div>
            <div><strong>Total Pengeluaran:</strong><br>${Utils.formatCurrency(totalOut, Settings.get('currency'))}</div>
            <div><strong>Selisih:</strong><br>${Utils.formatCurrency(totalIn - totalOut, Settings.get('currency'))}</div>
          </div>
          <table>
            <thead><tr><th>Tanggal</th><th>Jam</th><th>Jenis</th><th>Kategori</th><th>Sumber</th><th>Nominal</th><th>Catatan</th></tr></thead>
            <tbody>
              ${txs.map((t) => `<tr>
                <td>${Utils.formatDate(t.date, 'DD/MM/YYYY')}</td>
                <td>${t.time || ''}</td>
                <td class="${t.type}">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
                <td>${Utils.escapeHtml(t.categoryName || '')}</td>
                <td>${Utils.escapeHtml(t.source || '')}</td>
                <td class="${t.type}">${t.type === 'income' ? '+' : '−'}${Utils.formatCurrency(t.amount, Settings.get('currency'))}</td>
                <td>${Utils.escapeHtml(t.note || '')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <button onclick="window.print()" style="margin-top:16px;padding:8px 16px;background:#10B981;color:#fff;border:none;border-radius:6px;cursor:pointer">Print / Save as PDF</button>
        </body></html>`);
      win.document.close();
      Toast.success('PDF siap - pilih "Save as PDF" di dialog print');
    }
  };

  function escapeXml(s) {
    return String(s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
  }

  global.Exporter = Exporter;
})(window);
