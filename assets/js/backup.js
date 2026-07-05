/* ============================================
   DompetKu — backup.js
   Full backup & restore. Optional AES-GCM encryption.
   ============================================ */

(function (global) {
  'use strict';

  const Backup = {
    /** Backup entire DB. If encrypted, prompt for password. */
    async backup(encrypted = false) {
      try {
        const data = await DB.exportAll();
        const json = JSON.stringify(data, null, 2);
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

        if (encrypted) {
          const pwd = prompt('Masukkan password untuk enkripsi backup:');
          if (!pwd) return;
          const pwdConfirm = prompt('Konfirmasi password:');
          if (pwd !== pwdConfirm) return Toast.error('Password tidak cocok');
          const salt = Crypto.randomSalt(16);
          const payload = await Crypto.encrypt(json, pwd, salt);
          const fileContent = JSON.stringify({
            type: 'dompetku-encrypted-backup',
            version: 1,
            salt,
            createdAt: new Date().toISOString(),
            payload
          }, null, 2);
          Utils.download(`dompetku-backup-${stamp}.enc.json`, fileContent, 'application/json');
          await Settings.set('lastBackupAt', new Date().toISOString());
          Toast.success('Backup terenkripsi dibuat');
        } else {
          Utils.download(`dompetku-backup-${stamp}.json`, json, 'application/json');
          await Settings.set('lastBackupAt', new Date().toISOString());
          Toast.success('Backup dibuat');
        }
      } catch (e) {
        console.error(e);
        Toast.error('Backup gagal: ' + e.message);
      }
    },

    /** Restore from file. Auto-detect encrypted vs plain. */
    async restore() {
      const files = await Utils.pickFile('.json,application/json', false);
      if (!files.length) return;
      const file = files[0];
      try {
        const text = await Utils.readFileAsText(file);
        const parsed = JSON.parse(text);

        let data;
        // Encrypted backup?
        if (parsed.type === 'dompetku-encrypted-backup' && parsed.payload) {
          const pwd = prompt('Masukkan password untuk dekripsi:');
          if (!pwd) return;
          const plain = await Crypto.decrypt(parsed.payload, pwd, parsed.salt);
          data = JSON.parse(plain);
        } else if (parsed.data && parsed.version) {
          // Plain backup
          data = parsed;
        } else {
          return Toast.error('Format backup tidak dikenali');
        }

        // Confirm
        const stats = Object.fromEntries(Object.entries(data.data || {}).map(([k, v]) => [k, v.length]));
        const statsStr = Object.entries(stats).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ');
        if (await Modal.confirm(`Restore backup? Semua data saat ini akan ditimpa.\n\nIsi backup: ${statsStr}`, { danger: true, okText: 'Restore' })) {
          await DB.importAll(data.data);
          Toast.success('Data berhasil direstore');
          setTimeout(() => location.reload(), 800);
        }
      } catch (e) {
        console.error(e);
        if (e.name === 'OperationError') Toast.error('Password salah atau file korup');
        else Toast.error('Restore gagal: ' + e.message);
      }
    }
  };

  global.Backup = Backup;
})(window);
