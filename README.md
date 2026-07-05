# DompetKu — PWA Catatan Keuangan Pribadi

Aplikasi web **Progressive Web App (PWA)** untuk mencatat seluruh keuangan pribadi: pemasukan, pengeluaran, utang, piutang, tabungan, aset, anggaran, target, dan laporan keuangan lengkap.

**100% offline-first.** Semua data tersimpan di perangkat Anda menggunakan IndexedDB. Tidak ada server, tidak ada backend, tidak ada framework. Dibangun dengan **HTML5 + CSS3 + JavaScript Vanilla** murni.

---

## Fitur Lengkap

### 📊 Dashboard
- Saldo saat ini, available, net worth
- Pemasukan, pengeluaran, tabungan, utang, piutang bulan ini
- Cicilan bulanan, total aset
- Persentase tabungan & pengeluaran
- Grafik pemasukan vs pengeluaran (6 bulan)
- Grafik komposisi pengeluaran (donut chart)
- Transaksi terkini + status anggaran

### 💰 Transaksi
- Pemasukan: gaji, bonus, komisi, THR, penjualan, cashback, hadiah, investasi, usaha, freelance, lainnya
- Pengeluaran: 23 kategori bawaan (makan, transport, rokok, vape, liquid, pulsa, listrik, dll)
- Field: nominal, tanggal, jam, kategori, sumber/metode, catatan, **lampiran foto bukti**
- Kategori dapat ditambah/edit/hapus sendiri

### 🔴 Utang & 🟢 Piutang
- Catat nama, kontak, nominal, tanggal pinjam, jatuh tempo, cicilan/bulan
- Bayar sebagian / lunas
- Riwayat pembayaran
- Progress bar & persentase pelunasan
- Auto-buat pengingat jatuh tempo
- Auto-update transaksi saat bayar/terima

### 🎯 Tabungan
- Multiple target (dana darurat, liburan, laptop, motor, rumah, modal usaha, dll)
- Target nominal + target tanggal
- Setor / tarik dengan auto-update transaksi
- Progress bar + persentase tercapai
- Riwayat transaksi per target

### 💎 Aset
- 10 jenis: uang tunai, rekening bank, e-wallet, crypto, emas, kendaraan, laptop, HP, elektronik, inventaris usaha
- Group by jenis, total nilai aset, total net worth

### 🎯 Anggaran
- Anggaran bulanan per kategori
- Tracking real-time vs actual
- Warning merah jika over budget
- Persentase penggunaan

### 📅 Kalender Keuangan
- View bulanan dengan transaksi per hari
- Navigasi bulan prev/next
- Klik tanggal untuk detail
- Legend pemasukan/pengeluaran

### 📈 Laporan
- Periode: harian, mingguan, bulanan, tahunan, custom
- Line chart (cash flow), Bar chart, Pie chart
- Statistik: pemasukan/pengeluaran terbesar, kategori paling boros/hemat, rata-rata
- Detail per kategori (table dengan %)
- Export laporan ke CSV/Excel/PDF/JSON

### 🔍 Pencarian & Filter
- Search di seluruh modul (transaksi, utang, piutang, tabungan, aset)
- Filter by jenis, kategori, bulan
- Quick filter buttons

### 💾 Export / Import / Backup
- **Export**: CSV, Excel (.xls SpreadsheetML), PDF (print), JSON
- **Import**: CSV, JSON
- **Backup**: full database JSON (plain atau AES-GCM encrypted)
- **Restore**: dari file backup (plain atau encrypted)
- Backup terenkripsi menggunakan PBKDF2 + AES-GCM 256-bit

### 🔔 Pengingat
- Auto-generate dari utang/piutang yang ada jatuh tempo
- Toast notification untuk jatuh tempo ≤ 7 hari
- Native browser notification (dengan permission)

### 🔐 Keamanan
- PIN aplikasi (4-6 digit) dengan SHA-256 + salt
- Auto-lock saat idle (1/5/15/30 menit)
- Bisa dimatikan jika tidak ingin pakai PIN
- Backup file bisa dienkripsi dengan password (AES-GCM 256-bit)

### 🎨 Tema & Personalisasi
- **Dark / Light / System** mode
- 8 warna aksen (emerald, blue, purple, rose, amber, cyan, indigo, teal)
- Pilihan mata uang (IDR, USD, EUR, SGD, MYR, JPY)
- Pilihan format tanggal (5 format)
- Kategori & ikon dapat dikustomisasi

---

## Struktur Folder

```
dompetku/
├── index.html              # App shell + PIN lock screen
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── robots.txt              # SEO
├── .nojekyll               # GitHub Pages bypass
├── README.md
│
└── assets/
    ├── css/
    │   ├── style.css       # Design system + theme
    │   ├── components.css  # UI components
    │   ├── pages.css       # Page-specific styles
    │   └── responsive.css  # Mobile responsive
    │
    ├── js/
    │   ├── db.js           # IndexedDB wrapper
    │   ├── crypto.js       # Web Crypto (PIN, AES-GCM)
    │   ├── utils.js        # Formatters & helpers
    │   ├── settings.js     # User preferences
    │   ├── theme.js        # Dark/light/accent
    │   ├── auth.js         # PIN + auto-lock
    │   ├── toast.js        # Toast notifications
    │   ├── modal.js        # Modal + confirm
    │   ├── charts.js       # Vanilla canvas charts
    │   ├── router.js       # Hash-based SPA router
    │   ├── export.js       # CSV/XLSX/PDF/JSON
    │   ├── import.js       # CSV/JSON parser
    │   ├── backup.js       # Backup & restore
    │   ├── reminders.js    # Due date reminders
    │   └── app.js          # Main entry
    │
    ├── components/
    │   ├── navbar.js
    │   ├── sidebar.js
    │   ├── forms.js
    │   ├── transaction-form.js
    │   ├── debt-form.js
    │   ├── saving-form.js
    │   ├── asset-form.js
    │   └── budget-form.js
    │
    ├── pages/
    │   ├── dashboard.js
    │   ├── transactions.js
    │   ├── debts.js
    │   ├── receivables.js
    │   ├── savings.js
    │   ├── assets.js
    │   ├── budgets.js
    │   ├── reports.js
    │   ├── calendar.js
    │   ├── search.js
    │   └── settings-page.js
    │
    ├── database/
    │   ├── schema.js       # DB schema documentation
    │   └── seed.js         # Default categories
    │
    ├── icons/
    │   ├── favicon.svg
    │   ├── icon-192.svg
    │   └── icon-512.svg
    │
    ├── export/             # (Reserved for export templates)
    ├── import/             # (Reserved for import parsers)
    ├── images/             # (Reserved for app images)
    └── fonts/              # (Uses system fonts for offline)
```

---

## Cara Menjalankan Secara Lokal

Karena aplikasi menggunakan IndexedDB + service worker, **wajib dijalankan via HTTP server** (tidak bisa via `file://`).

### Opsi 1: Python (paling mudah, sudah terinstall di Mac/Linux)
```bash
cd dompetku
python3 -m http.server 8000
```
Buka browser ke `http://localhost:8000`

### Opsi 2: Node.js
```bash
cd dompetku
npx serve -l 8000
```

### Opsi 3: VS Code
Install ekstensi **Live Server**, klik kanan `index.html` → "Open with Live Server".

### Opsi 4: PHP
```bash
cd dompetku
php -S localhost:8000
```

---

## Cara Pakai

### 1. Setup Awal
- Buka aplikasi di browser
- (Opsional) Aktifkan PIN di menu **Pengaturan → Keamanan**
- Pilih tema, warna aksen, mata uang, format tanggal di **Pengaturan**

### 2. Mulai Mencatat
- Klik tombol **+ Pemasukan** / **+ Pengeluaran** di dashboard atau halaman Transaksi
- Atau gunakan tombol **+** di navbar untuk quick add
- Isi nominal, kategori, tanggal, dan (opsional) lampiran foto

### 3. Tambah Utang/Piutang/Tabungan/Aset
- Buka menu di sidebar
- Klik tombol tambah di pojok kanan atas
- Untuk utang/piutang: sistem otomatis membuat transaksi saat ada pembayaran

### 4. Atur Anggaran
- Buka menu **Anggaran**
- Pilih bulan, tambah anggaran per kategori
- Sistem otomatis memberi warning merah jika over budget

### 5. Backup Berkala
- Buka **Pengaturan → Data & Backup**
- Klik **Backup** untuk export data (JSON)
- Untuk keamanan ekstra, gunakan **Backup Terenkripsi** dengan password
- Simpan file backup di tempat aman (Google Drive, dll)

### 6. Install sebagai PWA
- Di Chrome/Edge: klik ikon install di address bar
- Atau menu ⋮ → **Install DompetKu**
- Aplikasi akan muncul sebagai app terpisah, bisa dibuka offline

---

## Deployment ke GitHub Pages

### Step 1: Buat Repository
1. Buka https://github.com/new
2. Repository name: `dompetku` (atau nama lain, **public**)
3. **Jangan** centang "Add a README"
4. Klik **Create repository**

### Step 2: Push File ke GitHub
```bash
cd dompetku
git init
git add .
git commit -m "Initial commit: DompetKu PWA"
git remote add origin https://github.com/USERNAME/dompetku.git
git branch -M main
git push -u origin main
```

### Step 3: Aktifkan GitHub Pages
1. Buka repository → **Settings** → **Pages**
2. Section **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` / root → **Save**
3. Tunggu 1-2 menit, website live di:
   ```
   https://USERNAME.github.io/dompetku/
   ```

### Step 4 (Opsional): Custom Domain
1. Di provider domain Anda, tambah record:
   - **A records** (4 IP GitHub Pages):
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **CNAME** `www` → `USERNAME.github.io`
2. Di GitHub: Settings → Pages → Custom domain → ketik domain → Save
3. Centang **Enforce HTTPS**

---

## Deployment ke Cloudflare Pages (Alternatif)

1. Login ke https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
2. **Connect to Git** → pilih repository `dompetku`
3. Konfigurasi build:
   - Framework preset: **None**
   - Build command: *(kosong)*
   - Build output directory: `/` (root)
4. **Save and Deploy**
5. Custom domain: tambah di tab **Custom domains** (gratis SSL otomatis)

---

## Troubleshooting

### App blank / data tidak muncul
- Pastikan diakses via `http://` atau `https://`, bukan `file://`
- Buka DevTools (F12) → Console → cek error
- Coba hapus service worker: DevTools → Application → Service Workers → Unregister

### PIN lupa
- Buka DevTools → Application → IndexedDB → hapus database `dompetku-db`
- Atau: Settings → Clear storage (browser settings)

### Data hilang setelah update
- IndexedDB persistence bervariasi antar browser. Lakukan **backup berkala** dari menu Pengaturan.

### Service Worker tidak update
- DevTools → Application → Service Workers → **Update on reload** → refresh

### Backup terenkripsi tidak bisa direstore
- Pastikan password benar. Salah password = file tidak bisa didekripsi (by design, tidak ada recovery).

---

## Privasi & Keamanan

✅ **100% Offline** — tidak ada koneksi internet yang dibutuhkan  
✅ **Tidak ada tracking** — tidak ada analytics, tidak ada ads  
✅ **Data lokal** — semua data di IndexedDB, tidak pernah dikirim ke server  
✅ **Enkripsi backup** — AES-GCM 256-bit dengan PBKDF2 key derivation  
✅ **PIN hash** — SHA-256 + random salt (tidak disimpan plain)  
✅ **Auto-lock** — kunci otomatis saat idle  

---

## Lisensi

Bebas digunakan untuk keperluan personal. Atribusi tidak wajib tapi dihargai.

---

## Tech Stack

- HTML5 (semantic, accessible)
- CSS3 (custom properties, grid, flexbox)
- JavaScript ES2020+ (Vanilla, no framework, no library)
- IndexedDB (offline database)
- Web Crypto API (encryption)
- Service Worker + Cache API (offline PWA)
- Canvas API (charts)
- Notification API (reminders)

**Total: 0 dependency. 0 KB library.**
