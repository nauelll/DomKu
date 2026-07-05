/* ============================================
   DompetKu — schema.js
   Database schema definitions & version helpers.
   Schema is also embedded in db.js (indexedDB creation),
   this module exposes constants for app code to reference.
   ============================================ */

(function (global) {
  'use strict';

  const SCHEMA = {
    transactions: {
      fields: {
        id: 'string',
        type: "'income'|'expense'",
        amount: 'number',
        date: 'ISO date (YYYY-MM-DD)',
        time: 'HH:MM',
        category: 'string (category id)',
        categoryName: 'string',
        source: 'string (income source / expense method)',
        method: 'string (cash, transfer, e-wallet, etc.)',
        note: 'string',
        attachmentId: 'string|null',
        createdAt: 'ISO datetime',
        updatedAt: 'ISO datetime'
      }
    },
    categories: {
      fields: {
        id: 'string',
        type: "'income'|'expense'",
        name: 'string',
        icon: 'string (emoji or icon name)',
        color: 'string (hex)',
        isDefault: 'boolean',
        createdAt: 'ISO datetime'
      }
    },
    debts: {
      fields: {
        id: 'string',
        creditorName: 'string',
        contact: 'string',
        originalAmount: 'number',
        remainingAmount: 'number',
        borrowedDate: 'ISO date',
        dueDate: 'ISO date|null',
        monthlyInstallment: 'number',
        interestRate: 'number',
        note: 'string',
        status: "'active'|'paid'|'overdue'",
        createdAt: 'ISO datetime',
        updatedAt: 'ISO datetime'
      }
    },
    debtPayments: {
      fields: {
        id: 'string',
        debtId: 'string',
        amount: 'number',
        date: 'ISO date',
        note: 'string',
        createdAt: 'ISO datetime'
      }
    },
    receivables: {
      fields: {
        id: 'string',
        debtorName: 'string',
        contact: 'string',
        originalAmount: 'number',
        remainingAmount: 'number',
        lentDate: 'ISO date',
        dueDate: 'ISO date|null',
        note: 'string',
        status: "'active'|'received'|'overdue'",
        createdAt: 'ISO datetime',
        updatedAt: 'ISO datetime'
      }
    },
    receivablePayments: {
      fields: {
        id: 'string',
        receivableId: 'string',
        amount: 'number',
        date: 'ISO date',
        note: 'string',
        createdAt: 'ISO datetime'
      }
    },
    savings: {
      fields: {
        id: 'string',
        name: 'string',
        targetAmount: 'number',
        currentAmount: 'number',
        targetDate: 'ISO date|null',
        icon: 'string',
        color: 'string',
        status: "'active'|'completed'|'cancelled'",
        note: 'string',
        createdAt: 'ISO datetime',
        updatedAt: 'ISO datetime'
      }
    },
    savingTransactions: {
      fields: {
        id: 'string',
        savingId: 'string',
        type: "'deposit'|'withdraw'",
        amount: 'number',
        date: 'ISO date',
        note: 'string',
        createdAt: 'ISO datetime'
      }
    },
    assets: {
      fields: {
        id: 'string',
        type: 'string',
        name: 'string',
        value: 'number',
        note: 'string',
        icon: 'string',
        createdAt: 'ISO datetime',
        updatedAt: 'ISO datetime'
      }
    },
    budgets: {
      fields: {
        id: 'string',
        category: 'string (category id)',
        categoryName: 'string',
        month: 'YYYY-MM',
        amount: 'number',
        createdAt: 'ISO datetime',
        updatedAt: 'ISO datetime'
      }
    },
    reminders: {
      fields: {
        id: 'string',
        title: 'string',
        type: "'debt'|'bill'|'saving'|'installment'|'custom'",
        relatedId: 'string|null',
        dueDate: 'ISO date',
        time: 'HH:MM',
        repeat: "'none'|'daily'|'weekly'|'monthly'|'yearly'",
        done: 'boolean',
        note: 'string',
        createdAt: 'ISO datetime'
      }
    },
    settings: {
      fields: { key: 'string', value: 'any' }
    },
    attachments: {
      fields: { id: 'string', data: 'dataURL', name: 'string', mime: 'string', createdAt: 'ISO datetime' }
    }
  };

  global.Schema = SCHEMA;
})(window);
