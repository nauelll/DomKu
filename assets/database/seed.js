/* ============================================
   DompetKu — seed.js
   Default categories (income + expense) seeded on first run.
   Also seeds a few starter reminders/budgets if empty.
   ============================================ */

(function (global) {
  'use strict';

  const DEFAULT_INCOME_CATEGORIES = [
    { id: 'inc-salary',     name: 'Gaji',                  icon: '💼', color: '#10B981' },
    { id: 'inc-bonus',      name: 'Bonus',                 icon: '🎁', color: '#22C55E' },
    { id: 'inc-commission', name: 'Komisi',                icon: '🤝', color: '#16A34A' },
    { id: 'inc-thr',        name: 'THR',                   icon: '🎉', color: '#84CC16' },
    { id: 'inc-sale',       name: 'Penjualan',             icon: '🛒', color: '#65A30D' },
    { id: 'inc-cashback',   name: 'Cashback',              icon: '💸', color: '#15803D' },
    { id: 'inc-gift',       name: 'Hadiah',                icon: '🎀', color: '#3B82F6' },
    { id: 'inc-invest',     name: 'Pendapatan Investasi',  icon: '📈', color: '#6366F1' },
    { id: 'inc-business',   name: 'Pendapatan Usaha',      icon: '🏪', color: '#8B5CF6' },
    { id: 'inc-freelance',  name: 'Pendapatan Freelance',  icon: '💻', color: '#A855F7' },
    { id: 'inc-other',      name: 'Pendapatan Lainnya',    icon: '➕', color: '#64748B' }
  ];

  const DEFAULT_EXPENSE_CATEGORIES = [
    { id: 'exp-food',       name: 'Makan',           icon: '🍽️', color: '#EF4444' },
    { id: 'exp-drink',      name: 'Minum',           icon: '🥤', color: '#F97316' },
    { id: 'exp-transport',  name: 'Transportasi',    icon: '🚗', color: '#3B82F6' },
    { id: 'exp-smoke',      name: 'Rokok',           icon: '🚬', color: '#71717A' },
    { id: 'exp-vape',       name: 'Vape',            icon: '💨', color: '#8B5CF6' },
    { id: 'exp-liquid',     name: 'Liquid',          icon: '🧴', color: '#06B6D4' },
    { id: 'exp-pulsa',      name: 'Pulsa',           icon: '📱', color: '#0EA5E9' },
    { id: 'exp-internet',   name: 'Internet',        icon: '🌐', color: '#0284C7' },
    { id: 'exp-electric',   name: 'Listrik',         icon: '⚡', color: '#F59E0B' },
    { id: 'exp-water',      name: 'Air',             icon: '💧', color: '#06B6D4' },
    { id: 'exp-rent',       name: 'Sewa',            icon: '🏠', color: '#8B5CF6' },
    { id: 'exp-shopping',   name: 'Belanja',         icon: '🛍️', color: '#EC4899' },
    { id: 'exp-health',     name: 'Kesehatan',       icon: '🏥', color: '#14B8A6' },
    { id: 'exp-medicine',   name: 'Obat',            icon: '💊', color: '#0D9488' },
    { id: 'exp-fun',        name: 'Hiburan',         icon: '🎮', color: '#A855F7' },
    { id: 'exp-education',  name: 'Pendidikan',      icon: '📚', color: '#3B82F6' },
    { id: 'exp-worktool',   name: 'Peralatan Kerja', icon: '🛠️', color: '#64748B' },
    { id: 'exp-capital',    name: 'Modal Usaha',     icon: '🏭', color: '#84CC16' },
    { id: 'exp-donation',   name: 'Donasi',          icon: '🤲', color: '#22C55E' },
    { id: 'exp-tax',        name: 'Pajak',           icon: '🧾', color: '#71717A' },
    { id: 'exp-admin',      name: 'Biaya Admin',     icon: '🏦', color: '#64748B' },
    { id: 'exp-transfer',   name: 'Biaya Transfer',  icon: '🔁', color: '#94A3B8' },
    { id: 'exp-other',      name: 'Pengeluaran Lain',icon: '➖', color: '#A1A1AA' }
  ];

  const DEFAULT_ASSET_CATEGORIES = [
    { id: 'cash', name: 'Uang Tunai',     icon: '💵' },
    { id: 'bank', name: 'Rekening Bank',  icon: '🏦' },
    { id: 'ewallet', name: 'E-Wallet',    icon: '📱' },
    { id: 'crypto', name: 'Crypto',       icon: '₿' },
    { id: 'gold', name: 'Emas',           icon: '🥇' },
    { id: 'vehicle', name: 'Kendaraan',   icon: '🚗' },
    { id: 'laptop', name: 'Laptop',       icon: '💻' },
    { id: 'phone', name: 'HP',            icon: '📱' },
    { id: 'electronic', name: 'Elektronik', icon: '🔌' },
    { id: 'inventory', name: 'Inventaris Usaha', icon: '📦' }
  ];

  async function seedAll(force = false) {
    const existingCats = await DB.getAll('categories');
    if (force || existingCats.length === 0) {
      const all = [
        ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, type: 'income', isDefault: true, createdAt: new Date().toISOString() })),
        ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, type: 'expense', isDefault: true, createdAt: new Date().toISOString() }))
      ];
      await DB.bulkPut('categories', all);
    }
  }

  global.Seed = {
    DEFAULT_INCOME_CATEGORIES,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_ASSET_CATEGORIES,
    seedAll
  };
})(window);
