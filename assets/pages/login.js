/* ============================================
   DomKu — login.js
   Login / signup page (Google + Email/Password).
   ============================================ */

(function (global) {
  'use strict';

  Router.register('login', (container) => {
    // If already logged in, redirect to dashboard
    if (AuthFB.isLoggedIn) {
      Router.go('dashboard');
      return;
    }

    container.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <img src="assets/images/logo-square.png" alt="DomKu" class="login-logo">
          <h1 class="login-title"><span style="color:#3B82F6">Dom</span><span style="color:#10B981">Ku</span></h1>
          <p class="login-subtitle">Personal Finance Tracker</p>

          <div class="login-tabs">
            <button class="login-tab active" data-tab="signin">Masuk</button>
            <button class="login-tab" data-tab="signup">Daftar</button>
          </div>

          <form class="login-form" data-form="signin">
            <div class="form-group">
              <label for="signin-email">Email</label>
              <input type="email" id="signin-email" placeholder="email@contoh.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label for="signin-password">Password</label>
              <input type="password" id="signin-password" placeholder="••••••••" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" data-loading="Masuk...">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Masuk
            </button>
            <button type="button" class="btn btn-ghost btn-block" data-reset>Lupa password?</button>
          </form>

          <form class="login-form hidden" data-form="signup">
            <div class="form-group">
              <label for="signup-name">Nama Lengkap</label>
              <input type="text" id="signup-name" placeholder="Nama Anda" required autocomplete="name">
            </div>
            <div class="form-group">
              <label for="signup-email">Email</label>
              <input type="email" id="signup-email" placeholder="email@contoh.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label for="signup-password">Password</label>
              <input type="password" id="signup-password" placeholder="Min 6 karakter" required autocomplete="new-password" minlength="6">
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" data-loading="Daftar...">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Daftar
            </button>
          </form>

          <div class="login-divider">
            <span>atau</span>
          </div>

          <button class="btn btn-outline btn-block btn-lg" data-google>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Lanjutkan dengan Google
          </button>

          <p class="login-footer">
            Dengan masuk, Anda menyetujui penyimpanan data keuangan di cloud Firebase yang aman.
          </p>

          <div class="login-offline-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            <span>Aplikasi tetap bisa dipakai offline. Data akan sinkron otomatis saat online.</span>
          </div>
        </div>
      </div>
    `;

    // Tab switching
    container.querySelectorAll('.login-tab').forEach((tab) => {
      tab.onclick = () => {
        container.querySelectorAll('.login-tab').forEach((t) => t.classList.remove('active'));
        container.querySelectorAll('.login-form').forEach((f) => f.classList.add('hidden'));
        tab.classList.add('active');
        container.querySelector(`[data-form="${tab.dataset.tab}"]`).classList.remove('hidden');
      };
    });

    // Sign in form
    container.querySelector('[data-form="signin"]').onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Masuk...';
      try {
        const email = container.querySelector('#signin-email').value.trim();
        const password = container.querySelector('#signin-password').value;
        await AuthFB.loginWithEmail(email, password);
        Router.go('dashboard');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    };

    // Sign up form
    container.querySelector('[data-form="signup"]').onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = 'Daftar...';
      try {
        const name = container.querySelector('#signup-name').value.trim();
        const email = container.querySelector('#signup-email').value.trim();
        const password = container.querySelector('#signup-password').value;
        await AuthFB.signUpWithEmail(email, password, name);
        Router.go('dashboard');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = 'Daftar...';
      }
    };

    // Reset password
    container.querySelector('[data-reset]').onclick = async () => {
      const email = container.querySelector('#signin-email').value.trim();
      if (!email) {
        Toast.info('Masukkan email terlebih dahulu di kolom email');
        return;
      }
      await AuthFB.resetPassword(email);
    };

    // Google login
    container.querySelector('[data-google]').onclick = async () => {
      const btn = container.querySelector('[data-google]');
      btn.disabled = true;
      btn.innerHTML = 'Memproses...';
      try {
        await AuthFB.loginWithGoogle();
        Router.go('dashboard');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Lanjutkan dengan Google`;
      }
    };
  });
})(window);
