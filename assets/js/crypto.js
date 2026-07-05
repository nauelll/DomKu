/* ============================================
   DompetKu — crypto.js
   Web Crypto helpers: hashing (SHA-256),
   key derivation (PBKDF2), symmetric encryption (AES-GCM).
   Used for PIN storage + encrypted backup files.
   ============================================ */

(function (global) {
  'use strict';

  const subtle = crypto.subtle;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  /** Random hex string of `bytes` bytes. */
  function randomSalt(bytes = 16) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** SHA-256 hex digest of a string. */
  async function sha256(text) {
    const buf = await subtle.digest('SHA-256', enc.encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Derive an AES-GCM key from a password + salt using PBKDF2. */
  async function deriveKey(password, saltHex, iterations = 100000) {
    const salt = hexToBytes(saltHex);
    const baseKey = await subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /** Encrypt a string → returns { iv, ciphertext } both hex-encoded. */
  async function encrypt(plaintext, password, saltHex) {
    const key = await deriveKey(password, saltHex);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    return {
      iv: bytesToHex(iv),
      ciphertext: bytesToHex(new Uint8Array(ct))
    };
  }

  /** Decrypt { iv, ciphertext } using password + salt. */
  async function decrypt(payload, password, saltHex) {
    const key = await deriveKey(password, saltHex);
    const iv = hexToBytes(payload.iv);
    const ct = hexToBytes(payload.ciphertext);
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return dec.decode(pt);
  }

  /** Hash a PIN for storage. Returns { hash, salt }. */
  async function hashPin(pin) {
    const salt = randomSalt(16);
    const hash = await sha256(salt + ':' + pin);
    return { hash, salt };
  }

  /** Verify a PIN against stored { hash, salt }. */
  async function verifyPin(pin, stored) {
    if (!stored || !stored.hash || !stored.salt) return false;
    const candidate = await sha256(stored.salt + ':' + pin);
    return constantTimeEqual(candidate, stored.hash);
  }

  /** Constant-time string comparison. */
  function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return result === 0;
  }

  /* ---------- byte/hex helpers ---------- */
  function bytesToHex(bytes) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  function hexToBytes(hex) {
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return arr;
  }

  global.Crypto = {
    randomSalt, sha256, deriveKey,
    encrypt, decrypt,
    hashPin, verifyPin,
    bytesToHex, hexToBytes
  };
})(window);
