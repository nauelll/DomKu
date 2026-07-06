/* ============================================
   DompetKu — reminders.js
   In-app reminders for debts due, savings targets, recurring bills.
   Uses local notifications if granted.
   ============================================ */

(function (global) {
  'use strict';

  const Reminders = {
    /** Check for due reminders and surface as in-app toasts. */
    async checkDueReminders() {
      const reminders = await DB.getAll('reminders');
      const today = Utils.todayISO();
      const due = reminders.filter((r) => !r.done && r.dueDate <= today);
      due.forEach((r) => {
        const days = Utils.daysUntil(r.dueDate);
        if (days <= 7) {
          const msg = days < 0 ? `⚠️ ${r.title} — sudah lewat ${Math.abs(days)} hari` :
                      days === 0 ? `🔔 ${r.title} — jatuh tempo hari ini` :
                      `📅 ${r.title} — ${days} hari lagi`;
          Toast.warning(msg, { duration: 5000 });
        }
      });
      // Auto-mark overdue
      const overdue = reminders.filter((r) => !r.done && r.dueDate < today && Utils.daysUntil(r.dueDate) < -7);
      overdue.forEach((r) => { r.done = true; DB.put('reminders', r); });
    },

    /** Generate reminders for upcoming debt due dates. */
    async regenerateDebtReminders() {
      const debts = await DB.getAll('debts');
      const active = debts.filter((d) => d.status !== 'paid' && d.dueDate);
      const existing = (await DB.getAll('reminders')).filter((r) => r.type === 'debt');
      for (const d of active) {
        const exists = existing.find((r) => r.relatedId === d.id);
        if (!exists) {
          await DB.add('reminders', {
            id: DB.uid(),
            title: `Jatuh tempo utang: ${d.creditorName}`,
            type: 'debt',
            relatedId: d.id,
            dueDate: d.dueDate,
            time: Settings.get('reminderTime') || '08:00',
            repeat: 'none',
            done: false,
            note: '',
            createdAt: new Date().toISOString()
          });
        } else if (exists.dueDate !== d.dueDate) {
          exists.dueDate = d.dueDate;
          exists.done = false;
          await DB.put('reminders', exists);
        }
      }
    },

    /** Request notification permission from user. */
    async requestPermission() {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      const result = await Notification.requestPermission();
      return result === 'granted';
    },

    /** Show a native notification (if permission granted). */
    notify(title, body) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        new Notification(title, { body, icon: 'assets/icons/icon-192.svg' });
      } catch (e) { /* ignore */ }
    }
  };

  global.Reminders = Reminders;
})(window);
