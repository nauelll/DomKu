/* ============================================
   DomKu — firebase.js
   Firebase initialization (modular SDK v10+).
   Exposes: auth, db (Firestore), googleProvider
   ============================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  enableNetwork,
  disableNetwork
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const config = window.FirebaseConfig;
if (!config || !config.apiKey || config.apiKey.includes('YOUR_API_KEY')) {
  console.warn('[DomKu] Firebase config belum diisi. Aplikasi akan jalan mode offline-only.');
}

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

try {
  app = initializeApp(config);
  auth = getAuth(app);
  // Use persistent cache for offline support
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    // Fallback if persistence fails (e.g., private mode)
    db = getFirestore(app);
  }
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
  console.error('[DomKu] Firebase init failed:', e);
}

// Network state management
let isOnline = navigator.onLine;
window.addEventListener('online', () => {
  isOnline = true;
  if (db) enableNetwork(db).catch(() => {});
  document.dispatchEvent(new CustomEvent('dompetku:network', { detail: { online: true } }));
});
window.addEventListener('offline', () => {
  isOnline = false;
  if (db) disableNetwork(db).catch(() => {});
  document.dispatchEvent(new CustomEvent('dompetku:network', { detail: { online: false } }));
});

// Expose to window for non-module scripts
window.Firebase = {
  app,
  auth,
  db,
  googleProvider,
  isOnline: () => isOnline && !!db,
  isConfigured: () => !!db && !!config.apiKey && !config.apiKey.includes('YOUR_API_KEY'),

  // Auth helpers
  signInWithGoogle: async () => {
    if (!auth || !googleProvider) throw new Error('Firebase belum dikonfigurasi');
    return signInWithPopup(auth, googleProvider);
  },
  signInWithEmail: async (email, password) => {
    if (!auth) throw new Error('Firebase belum dikonfigurasi');
    return signInWithEmailAndPassword(auth, email, password);
  },
  signUpWithEmail: async (email, password, displayName) => {
    if (!auth) throw new Error('Firebase belum dikonfigurasi');
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(result.user, { displayName });
    // Create user document
    await window.Firebase.createUserDoc(result.user, displayName);
    return result;
  },
  signOut: async () => {
    if (!auth) return;
    return signOut(auth);
  },
  resetPassword: async (email) => {
    if (!auth) throw new Error('Firebase belum dikonfigurasi');
    return sendPasswordResetEmail(auth, email);
  },
  onAuthChange: (cb) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, cb);
  },

  // Firestore helpers
  createUserDoc: async (user, displayName) => {
    if (!db) return;
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        defaultWalletId: null,
        wallets: []
      });
    }
  },

  // Re-export Firestore functions for convenience
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp
};
