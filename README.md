# DomKu — PWA Catatan Keuangan Pribadi (Firebase Edition)

Aplikasi web **Progressive Web App (PWA)** untuk mencatat seluruh keuangan pribadi: pemasukan, pengeluaran, utang, piutang, tabungan, aset, anggaran, target, dan laporan keuangan lengkap.

**Offline-first.** Semua data tersimpan di IndexedDB (cache lokal) + Firebase Firestore (cloud). Tidak ada server, tidak ada backend, tidak ada framework. Dibangun dengan **HTML5 + CSS3 + JavaScript Vanilla** + Firebase SDK v10 modular.

**Versi Firebase:** Mendukung login (Google + Email), wallet bersama dengan pasangan real-time, dan sinkronisasi cloud otomatis. Tetap di-hosting di GitHub Pages.

---

## 📋 Setup Firebase (WAJIB sebelum deploy)

### Step 1: Buat Firebase Project
1. Buka https://console.firebase.google.com
2. Klik **Add project** → isi nama (misal: `domku-app`) → klik Continue
3. Disable Google Analytics (tidak perlu untuk app ini) → Create project

### Step 2: Aktifkan Firestore Database
1. Di sidebar kiri → **Firestore Database** → **Create database**
2. Pilih **Start in production mode** → pilih region (Singapore untuk Indonesia) → Enable

### Step 3: Aktifkan Authentication
1. Sidebar → **Authentication** → **Get started**
2. Tab **Sign-in method** → enable:
   - **Email/Password** → toggle Enable → Save
   - **Google** → toggle Enable → isi support email → Save

### Step 4: Dapatkan Config
1. Sidebar → **Project settings** (gear icon)
2. Scroll ke **Your apps** → klik **Web** icon (`</>`)
3. Isi app nickname (`domku-web`) → Register app
4. Copy config object yang muncul

### Step 5: Update firebase-config.js
File `assets/js/firebase-config.js` sudah diisi dengan config project `domku-5b7cf`:

```js
window.FirebaseConfig = {
  apiKey: "AIzaSyCm7JofZUgWws65Y-3yQ1WBaeKK2laBcIU",
  authDomain: "domku-5b7cf.firebaseapp.com",
  projectId: "domku-5b7cf",
  storageBucket: "domku-5b7cf.firebasestorage.app",
  messagingSenderId: "589186943575",
  appId: "1:589186943575:web:1e65e7b344aa4244eaf112",
  enableOffline: true
};
```

### Step 6: Aktifkan Google Sign-In Provider
1. Firebase Console → **Authentication** → **Sign-in method**
2. Klik **Google** → toggle **Enable** → isi Support Email → **Save**
3. Pastikan **Email/Password** juga di-enable

### Step 7: Tambah Authorized Domains
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Klik **Add domain** → tambah:
   - `localhost` (untuk test lokal)
   - `USERNAME.github.io` (domain GitHub Pages Anda)
   - Custom domain jika pakai (misal: `domku.com`)

### Step 8: Deploy Firestore Security Rules
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Di folder project, init firebase
firebase init firestore
# Pilih project domku-5b7cf
# Pilih "Use existing rules file" → firestore.rules

# Deploy rules
firebase deploy --only firestore:rules
```

---

## Fitur Lengkap

### 🔐 Authentication (NEW)
- **Login Google** — one click via popup
- **Email & Password** — signup + signin + reset password
- **PIN aplikasi** (existing) — tetap bisa dipakai sebagai second layer security
- **Auto-lock** saat idle

### 💑 Couple Wallet (NEW)
- Buat wallet **Pribadi** atau **Bersama**
- Undang pasangan via:
  - **Email** — invitation terkirim otomatis
  - **Kode undangan** — 6 karakter, share via chat
  - **Share link** — deep link langsung ke halaman accept
- Wallet bersama = **real-time sync**. Pasangan tambah transaksi → HP Anda langsung update tanpa refresh
- Multi-wallet: bisa punya banyak wallet, switch kapan saja

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
- **Format nominal Indonesia**: ketik `13.844.000` → auto-format

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

### 🔔 Notifikasi & Audit Log (NEW)
- **Real-time notification** saat pasangan menambah transaksi
- **Activity log** lengkap: "Naufal menambah pengeluaran Rp 50.000" dengan timestamp
- Badge counter di navbar
- Mark as read / mark all read

### 💾 Export / Import / Backup
- **Export**: CSV, Excel (.xls), PDF (print), JSON
- **Import**: CSV, JSON
- **Backup**: full database JSON (plain atau AES-GCM encrypted)
- **Restore**: dari file backup (plain atau encrypted)

### 🔄 Offline-First + Auto Sync (NEW)
- **Mode offline**: aplikasi tetap jalan, semua perubahan disimpan ke IndexedDB
- **Saat online kembali**: sinkronisasi otomatis ke Firestore, tidak ada data hilang
- **Retry dengan exponential backoff** jika sync gagal
- **Sync indicator** di navbar (Online / Offline / Syncing)

### 🚚 Migration Dialog (NEW)
Saat login pertama kali dengan data lokal:
- **Gabungkan ke Cloud** — tambah data lokal ke cloud
- **Ganti Data Cloud** — hapus data cloud, ganti dengan lokal
- **Abaikan** — pakai data cloud, hapus data lokal

### 🔐 Keamanan
- **PIN aplikasi** (4-6 digit) dengan SHA-256 + salt
- **Auto-lock** saat idle (1/5/15/30 menit)
- **Backup terenkripsi** AES-GCM 256-bit dengan PBKDF2
- **Firestore Security Rules** — user hanya bisa akses wallet miliknya, wallet bersama hanya untuk anggota

### 🎨 Tema & Personalisasi
- **Dark / Light / System** mode
- 8 warna aksen (emerald, blue, purple, rose, amber, cyan, indigo, teal)
- Pilihan mata uang (IDR, USD, EUR, SGD, MYR, JPY)
- Pilihan format tanggal (5 format)
- Kategori & ikon dapat dikustomisasi

---

## Struktur Firestore

```
users/
  {uid}/
    - uid, email, displayName, photoURL
    - defaultWalletId
    - wallets: [walletId1, walletId2, ...]

wallets/
  {walletId}/
    - name, type (personal|couple), emoji
    - ownerId
    - members: { uid: true }
    - memberInfo: { uid: { displayName, photoURL, role, joinedAt } }
    
    transactions/{txId}     - pemasukan & pengeluaran
    categories/{catId}      - kategori
    debts/{debtId}          - utang
    debtPayments/{payId}    - riwayat bayar utang
    receivables/{recId}     - piutang
    receivablePayments/{payId}
    savings/{savId}         - target tabungan
    savingTransactions/{txId}
    assets/{assetId}        - aset
    budgets/{budId}         - anggaran bulanan
    reminders/{remId}       - pengingat
    attachments/{attId}     - foto bukti
    auditLogs/{logId}       - riwayat aktivitas (immutable)
    settings/{setId}        - pengaturan per-user dalam wallet

invitations/
  {invId}/
    - walletId, walletName
    - inviterId, inviterName
    - inviteeEmail (nullable)
    - code (6 chars)
    - status (pending|accepted|rejected|expired)
    - createdAt, expiresAt

notifications/
  {notifId}/
    - userId (penerima)
    - walletId
    - title, text
    - read (boolean)
    - createdAt
```

---

## Cara Menjalankan Secara Lokal

### Opsi 1: Python (paling mudah)
```bash
cd domku
python3 -m http.server 8000
```
Buka browser ke `http://localhost:8000`

### Opsi 2: Node.js
```bash
cd domku
npx serve -l 8000
```

---

## Deployment ke GitHub Pages

### Step 1: Buat Repository
1. Buka https://github.com/new
2. Repository name: `domku` (atau nama lain, **public**)
3. **Jangan** centang "Add a README"
4. Klik **Create repository**

### Step 2: Push File ke GitHub
```bash
cd domku
git init
git add .
git commit -m "Initial commit: DomKu PWA with Firebase"
git remote add origin https://github.com/USERNAME/domku.git
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
   https://USERNAME.github.io/domku/
   ```

### Step 4: Tambah Domain ke Firebase Auth
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Tambah `USERNAME.github.io` (dan custom domain jika ada)

### Step 5 (Opsional): Custom Domain
1. Di provider domain Anda, tambah record:
   - **A records** (4 IP GitHub Pages):
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **CNAME** `www` → `USERNAME.github.io`
2. Di GitHub: Settings → Pages → Custom domain → ketik domain → Save
3. Centang **Enforce HTTPS**
4. Tambah custom domain ke Firebase Authorized domains

---

## Troubleshooting

### "Firebase config belum diisi"
Edit `assets/js/firebase-config.js` dengan config Anda yang sebenarnya dari Firebase Console.

### Login Google gagal (popup blocked)
Izinkan popup untuk domain Anda di browser settings.

### Login Google gagal (unauthorized domain)
Tambahkan domain Anda ke Firebase Console → Authentication → Settings → Authorized domains.

### Data tidak sync real-time
- Cek koneksi internet
- Cek sync indicator di navbar (harus "Tersinkron")
- DevTools → Application → Service Workers → Unregister → reload
- Pastikan Firestore Security Rules sudah di-deploy

### PIN lupa
- Buka DevTools → Application → IndexedDB → hapus database `domku-cache`
- Atau: Settings → Clear storage (browser settings)

### Service Worker tidak update
- DevTools → Application → Service Workers → **Update on reload** → refresh

### Data hilang setelah update
- IndexedDB persistence bervariasi antar browser. Lakukan **backup berkala** dari menu Pengaturan.

---

## Privasi & Keamanan

✅ **Offline-first** — aplikasi tetap jalan tanpa internet
✅ **Data lokal + cloud** — IndexedDB cache + Firestore sync
✅ **Tidak ada tracking** — tidak ada analytics, tidak ada ads
✅ **Firestore Security Rules** — user hanya bisa akses wallet miliknya
✅ **PIN hash** — SHA-256 + random salt
✅ **Backup terenkripsi** — AES-GCM 256-bit dengan PBKDF2
✅ **Audit log immutable** — setiap perubahan tercatat, tidak bisa dihapus

---

## Tech Stack

- HTML5 (semantic, accessible)
- CSS3 (custom properties, grid, flexbox)
- JavaScript ES2020+ (Vanilla, no framework)
- **Firebase v10+ modular SDK** (Auth, Firestore, Realtime listeners)
- IndexedDB (offline cache)
- Web Crypto API (encryption)
- Service Worker + Cache API (offline PWA)
- Canvas API (charts)

**Total: 0 dependency. 0 KB library (kecuali Firebase via CDN).**

---

## Lisensi

Bebas digunakan untuk keperluan personal. Atribusi tidak wajib tapi dihargai.
