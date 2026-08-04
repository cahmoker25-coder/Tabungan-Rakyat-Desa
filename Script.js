// ==========================================
// 1. INISIALISASI FIREBASE REALTIME DATABASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB-aIIsMKKdtQhcTfu_dlx__rW9DUe-OnE",
  authDomain: "tabungan-rakyat.firebaseapp.com",
  databaseURL: "https://tabungan-rakyat-default-rtdb.firebaseio.com",
  projectId: "tabungan-rakyat",
  storageBucket: "tabungan-rakyat.firebasestorage.app",
  messagingSenderId: "1003203577637",
  appId: "1:1003203577637:web:f8fa13d78047c8e35a7ccc"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = typeof firebase !== 'undefined' ? firebase.database() : null;

// Global Variables
let currentUser = null;
let isBalanceHidden = false;
let globalTransactions = [];
let globalUsers = {};
let globalTrxs = {};

// ==========================================
// 2. DOM READY INITIALIZER
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
  const timeEl = document.getElementById('current-time');
  if (timeEl) {
    const updateClock = () => {
      const now = new Date();
      timeEl.innerText = now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' });
    };
    setInterval(updateClock, 1000);
    updateClock();
  }

  const boxLogin = document.getElementById("box-login");
  if (boxLogin) {
    const session = JSON.parse(localStorage.getItem("loggedUser") || sessionStorage.getItem("loggedUser"));
    if (session && session.role !== "admin") {
      window.location.href = "user-dashboard.html";
      return;
    }

    if(typeof initRealtimePasswordCheck === 'function') {
      initRealtimePasswordCheck("reg-password", "reg-confirm-password", "pass-match-status", "rule-");
      initRealtimePasswordCheck("forget-new-pass", "forget-conf-pass", "forget-match-status", "forget-rule-");
    }
    
    if(typeof initUsernameAutoSuggest === 'function') initUsernameAutoSuggest();
    if(typeof initLoginUserHandler === 'function') initLoginUserHandler();
    if(typeof initRegisterUserHandler === 'function') initRegisterUserHandler();
  }

  const valBalance = document.getElementById("val-balance");
  if (valBalance) {
    initUserDashboard();
    startWithdrawalToastLoop();
  }

  const tbVerif = document.getElementById("tb-verifikasi");
  if (tbVerif) {
    initAdminDashboard();
  }
});

// ==========================================
// 3. LOGIKA VALIDASI SANDI DINAMIS
// ==========================================
function validateComplexPassword(pass) {
  const minLength = pass.length >= 8;
  const hasCaps = /[A-Z]/.test(pass) && /[a-z]/.test(pass);
  const hasNum = /[0-9]/.test(pass);
  const hasSymbol = /[?!;:*&$,@]/.test(pass);
  return { minLength, hasCaps, hasNum, hasSymbol, isValid: minLength && hasCaps && hasNum && hasSymbol };
}

function initRealtimePasswordCheck(passInputId, confInputId, matchStatusId, rulesPrefix) {
  const passInput = document.getElementById(passInputId);
  const confInput = document.getElementById(confInputId);
  const matchStatus = document.getElementById(matchStatusId);
  const rulesContainer = document.getElementById("dynamic-pass-rules");

  if (passInput) {
    passInput.addEventListener("input", function () {
      const v = passInput.value;
      if (v.length > 0) {
        if (rulesContainer) rulesContainer.style.display = "block";
      } else {
        if (rulesContainer) rulesContainer.style.display = "none";
      }

      const res = validateComplexPassword(v);
      const updateRule = (id, valid, text) => {
        const el = document.getElementById(id);
        if (el) {
          el.className = valid ? "rule-item valid" : "rule-item invalid";
          el.innerText = (valid ? "✔ " : "✖ ") + text;
        }
      };

      updateRule(rulesPrefix + "len", res.minLength, "Min. 8 Karakter");
      updateRule(rulesPrefix + "caps", res.hasCaps, "Huruf Kapital & Kecil");
      updateRule(rulesPrefix + "num", res.hasNum, "Ada Angka");
      updateRule(rulesPrefix + "sym", res.hasSymbol, "Simbol (!?;:*&$,@)");

      if (confInput && confInput.value.length > 0) checkMatch();
    });
  }

  function checkMatch() {
    if (!confInput || !matchStatus) return;
    if (confInput.value === passInput.value && confInput.value.length > 0) {
      matchStatus.style.color = "#4ade80"; matchStatus.innerText = "✔ Sandi Cocok";
    } else if (confInput.value.length > 0) {
      matchStatus.style.color = "#f87171"; matchStatus.innerText = "✖ Sandi Tidak Cocok";
    } else { matchStatus.innerText = ""; }
  }

  if (confInput) confInput.addEventListener("input", checkMatch);
}

// ==========================================
// 4. NAVIGASI & AUTH USER
// ==========================================
function switchForm(target) {
  const boxLogin = document.getElementById('box-login');
  const boxDaftar = document.getElementById('box-daftar');
  const boxLupa = document.getElementById('box-lupa');
  
  if (!boxLogin || !boxDaftar || !boxLupa) return;

  boxLogin.classList.add('hidden');
  boxDaftar.classList.add('hidden');
  boxLupa.classList.add('hidden');

  if (target === 'daftar') boxDaftar.classList.remove('hidden');
  else if (target === 'lupa') { boxLupa.classList.remove('hidden'); resetForgetForm(); }
  else boxLogin.classList.remove('hidden');
}

function togglePassword(inputId, el) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; el.innerText = '🙈'; }
  else { input.type = 'password'; el.innerText = '👁️'; }
}

function initUsernameAutoSuggest() {
  const regUsernameInput = document.getElementById("reg-username");
  if (regUsernameInput && db) {
    regUsernameInput.addEventListener("blur", function () {
      let u = regUsernameInput.value.trim().toLowerCase().replace(/\s+/g, "");
      if (!u) return;
      db.ref("users/" + u).once("value", (snap) => {
        const statusEl = document.getElementById("username-status");
        if (snap.exists()) {
          const randomSuffix = Math.floor(100 + Math.random() * 900);
          const newUsername = u + randomSuffix;
          regUsernameInput.value = newUsername;
          if (statusEl) {
            statusEl.className = "username-status auto";
            statusEl.innerText = `⚠️ Username telah dipakai. Diganti otomatis ke @${newUsername}`;
          }
          alert(`Username @${u} sudah terdaftar! Otomatis disarankan: @${newUsername}`);
        } else {
          if (statusEl) {
            statusEl.className = "username-status valid"; statusEl.style.color = "#4ade80";
            statusEl.innerText = `✔ Username @${u} tersedia`;
          }
        }
      });
    });
  }
}

function initLoginUserHandler() {
  const formLogin = document.getElementById("form-login");
  if (formLogin && db) {
    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      const identifier = document.getElementById("login-identifier").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value.trim();

      db.ref("users").once("value", (snapshot) => {
        if (!snapshot.exists()) return alert("Data pengguna tidak ditemukan di database!");
        let foundUser = null;
        snapshot.forEach((child) => {
          const uData = child.val();
          if (
            (uData.username && uData.username.toLowerCase() === identifier) ||
            (uData.email && uData.email.toLowerCase() === identifier) ||
            (uData.phone && uData.phone === identifier)
          ) { foundUser = uData; }
        });

        if (!foundUser) return alert("Username, Email, atau Nomor HP tidak terdaftar!");
        if (foundUser.password !== password) return alert("Kata Sandi Anda Salah!");
        if (foundUser.status === "banned") return alert("Akses Ditolak: Akun Anda diblokir oleh Bendahara!");

        const nowStr = new Date().toLocaleString("id-ID");
        db.ref("users/" + foundUser.username).update({ lastLogin: nowStr, isOnline: true });
        foundUser.lastLogin = nowStr;
        foundUser.isOnline = true;

        localStorage.setItem("loggedUser", JSON.stringify(foundUser));
        alert("🎉 Login Berhasil! Selamat datang kembali.");
        window.location.href = "user-dashboard.html";
      });
    });
  }
}

function initRegisterUserHandler() {
  const formDaftar = document.getElementById("form-daftar");
  if (formDaftar && db) {
    formDaftar.addEventListener("submit", function (e) {
      e.preventDefault();

      const fullname = document.getElementById("reg-fullname").value.trim();
      const emailPrefix = document.getElementById("reg-email-prefix").value.trim();
      const emailProvider = document.getElementById("reg-email-provider").value;
      const email = emailPrefix + emailProvider;

      const phone = document.getElementById("reg-phone").value.trim();
      const pob = document.getElementById("reg-pob").value.trim();

      const bank = document.getElementById("reg-bank") ? document.getElementById("reg-bank").value : "-";
      const accName = document.getElementById("reg-acc-name") ? document.getElementById("reg-acc-name").value.trim() : "-";
      const accNum = document.getElementById("reg-acc-number") ? document.getElementById("reg-acc-number").value.trim() : "-";

      const dobDay = document.getElementById("reg-dob-day").value;
      const dobMonth = document.getElementById("reg-dob-month").value;
      const dobYear = document.getElementById("reg-dob-year").value;
      const dob = `${dobDay}/${dobMonth}/${dobYear}`;

      const mother = document.getElementById("reg-mother").value.trim().toLowerCase();
      const username = document.getElementById("reg-username").value.trim().toLowerCase();
      const password = document.getElementById("reg-password").value;
      const confirmPassword = document.getElementById("reg-confirm-password").value;

      if (phone.length < 10) return alert("Nomor HP minimal 10 angka!");

      const passVal = validateComplexPassword(password);
      if (!passVal.isValid) return alert("Peringatan Sandi Baru: Harus minimal 8 karakter dengan kombinasi Huruf Kapital, Huruf Kecil, Angka, dan Simbol (!?;:*&$,@)!");
      if (password !== confirmPassword) return alert("Peringatan: Konfirmasi sandi baru tidak cocok dengan sandi di atas!");

      db.ref("users/" + username).once("value", (snap) => {
        if (snap.exists()) {
          alert("Username sudah terdaftar! Periksa rekomendasi username.");
        } else {
          const newUserObject = {
            fullname: fullname, username: username, email: email, phone: phone, birthPlace: pob,
            bank: bank, accountName: accName, accountNumber: accNum, birthDate: dob, motherName: mother,
            password: password, role: "user", balance: 100000, status: "pending_verification",
            isOnline: false, muted: false, warning: "", lastLogin: "-", createdAt: new Date().toLocaleString("id-ID")
          };

          db.ref("users/" + username).set(newUserObject, (err) => {
            if (err) alert("Gagal Mendaftar: " + err.message);
            else {
              alert("🎉 Pendaftaran Berhasil! Bonus saldo Rp 100.000 (terkunci). Lakukan setoran awal min. Rp 50.000 di menu Isi Saldo agar akun aktif.");
              formDaftar.reset(); switchForm('login');
            }
          });
        }
      });
    });
  }
}

// ==========================================
// 5. LUPA PASSWORD (TANPA PIN)
// ==========================================
let resetUserData = null;

function resetForgetForm() {
  resetUserData = null;
  const sub = document.getElementById("forget-step-subtitle");
  if (sub) sub.innerText = "Langkah 1: Verifikasi Username";
  
  ["forget-step-1","forget-step-2","forget-step-3","forget-step-4"].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) idx === 0 ? el.classList.remove("hidden") : el.classList.add("hidden");
  });
}

function resetStep1() {
  const u = document.getElementById("forget-username").value.trim().toLowerCase();
  if (!u) return alert("Masukkan username Anda!");
  db.ref("users/" + u).once("value", (snap) => {
    if (!snap.exists()) return alert("Username tidak ditemukan di database!");
    resetUserData = snap.val();
    document.getElementById("forget-step-1").classList.add("hidden");
    document.getElementById("forget-step-2").classList.remove("hidden");
    document.getElementById("forget-step-subtitle").innerText = "Langkah 2: Verifikasi Nomor Telepon";
  });
}

function resetStep2() {
  const phone = document.getElementById("forget-phone").value.trim();
  if (!phone) return alert("Masukkan nomor telepon terdaftar!");
  if (resetUserData.phone === phone) {
    document.getElementById("forget-step-2").classList.add("hidden");
    document.getElementById("forget-step-3").classList.remove("hidden");
    document.getElementById("forget-step-subtitle").innerText = "Langkah 3: Verifikasi Nama Ibu Kandung";
  } else {
    alert("Nomor Telepon SALAH!");
  }
}

function resetStep3() {
  const mother = document.getElementById("forget-mother").value.trim().toLowerCase();
  if (!mother) return alert("Masukkan nama ibu kandung!");
  if (resetUserData.motherName === mother || resetUserData.mother === mother) {
    document.getElementById("forget-step-3").classList.add("hidden");
    document.getElementById("forget-step-4").classList.remove("hidden");
    document.getElementById("forget-step-subtitle").innerText = "Langkah 4: Buat Sandi Baru";
  } else { 
    alert("Jawaban Nama Ibu Kandung SALAH!"); 
  }
}

function resetStep4From3() {
  const newPass = document.getElementById("forget-new-pass").value;
  const confPass = document.getElementById("forget-conf-pass").value;
  const valRes = validateComplexPassword(newPass);
  
  if (!valRes.isValid) return alert("Peringatan Sandi Baru: Minimal 8 karakter dengan kombinasi Huruf Kapital, Huruf Kecil, Angka, dan Simbol (!?;:*&$,@)!");
  if (newPass !== confPass) return alert("Peringatan: Konfirmasi sandi baru tidak cocok dengan sandi baru di atas!");

  db.ref("users/" + resetUserData.username).update({ password: newPass }, (err) => {
    if (!err) { 
      alert("🎉 Kata Sandi Berhasil Diubah! Silakan login dengan sandi baru Anda."); 
      switchForm('login'); 
    } else { 
      alert("Gagal memperbarui sandi: " + err.message); 
    }
  });
}

// ==========================================
// 6. LOGIN ADMIN
// ==========================================
function handleAdminLogin(e) {
  if (e) e.preventDefault();

  const uEl = document.getElementById("admin-username");
  const pEl = document.getElementById("admin-password");
  if (!uEl || !pEl) return alert("Input login tidak ditemukan!");

  const u = uEl.value.trim();
  const p = pEl.value.trim();

  if (u === "RhyoTama" && p === "SatrioIsna123!") {
    const adminData = { username: "RhyoTama", fullname: "Bendahara Utama", role: "admin" };
    localStorage.setItem("loggedUser", JSON.stringify(adminData));
    
    if (db) {
      db.ref("users/RhyoTama").update({ 
        username: "RhyoTama", role: "admin", password: "SatrioIsna123!", fullname: "Bendahara Utama", isOnline: true
      });
    }

    alert("🔓 Otentikasi Berhasil! Masuk sebagai Bendahara Utama...");
    window.location.href = "admin.html";
    return false;
  }

  if (db) {
    db.ref("users/" + u).once("value", (snap) => {
      if (snap.exists() && snap.val().password === p && snap.val().role === "admin") {
        localStorage.setItem("loggedUser", JSON.stringify(snap.val()));
        db.ref("users/" + u).update({ isOnline: true });
        alert("🔓 Otentikasi Berhasil!");
        window.location.href = "admin.html";
      } else { alert("Akses Ditolak: ID atau Password Admin Salah!"); }
    });
  } else { alert("Akses Ditolak: ID atau Password Salah!"); }

  return false;
}

// ==========================================
// 7. DASHBOARD USER & FITUR SOSIAL
// ==========================================
let currentSecType = "";

function initUserDashboard() {
  const session = JSON.parse(localStorage.getItem("loggedUser") || sessionStorage.getItem("loggedUser"));
  if (!session || session.role === "admin") {
    window.location.href = "index.html";
    return;
  }
  currentUser = session;

  db.ref("users/" + currentUser.username).on("value", (snap) => {
    if (snap.exists()) {
      currentUser = snap.val();
      
      if (currentUser.status === "banned") {
        alert("🚨 Akses Ditolak: Akun Anda telah diblokir (Banned) oleh Bendahara.");
        logoutUser();
        return;
      }

      document.getElementById("val-fullname").innerText = currentUser.fullname || currentUser.username;
      if (!isBalanceHidden) {
        document.getElementById("val-balance").innerText = "Rp " + (currentUser.balance || 0).toLocaleString('id-ID');
      }
      
      const pFull = document.getElementById("prof-fullname"); if(pFull) pFull.innerText = currentUser.fullname || "-";
      const pLast = document.getElementById("log-last-login"); if(pLast) pLast.innerText = currentUser.lastLogin || "Baru Saja";

      const logStatus = document.getElementById("log-status-akun");
      if (logStatus) {
        if (currentUser.status === "active") {
          logStatus.innerText = "Aktif (Terverifikasi)";
          logStatus.style.color = "#10b981";
        } else {
          logStatus.innerText = "Menunggu Verifikasi Setoran Awal (Min. Rp 50.000)";
          logStatus.style.color = "#f59e0b";
        }
      }

      const warnBox = document.getElementById("box-warning");
      if (currentUser.warning) {
        document.getElementById("text-warning").innerText = currentUser.warning;
        if(warnBox) warnBox.classList.remove("hidden");
      } else {
        if(warnBox) warnBox.classList.add("hidden");
      }
    }
  });

  bindUserEvents();

  db.ref("transactions").on("value", (snap) => {
    const trxs = snap.val();
    globalTransactions = [];
    if (trxs) {
      Object.keys(trxs).reverse().forEach(key => {
        const t = trxs[key];
        if (t.username === currentUser.username || t.targetUser === currentUser.username) {
          globalTransactions.push({ id: key, ...t });
        }
      });
    }
    renderUserTransactions();
    renderPendingMoneyRequests();
  });

  loadFriendsList();

  window.addEventListener("beforeunload", () => {
    if (db && currentUser) {
      db.ref("users/" + currentUser.username).update({ isOnline: false });
    }
  });
}

function bindUserEvents() {
  const btnEye = document.getElementById("btn-eye-balance");
  if(btnEye) btnEye.addEventListener("click", toggleBalanceHide);

  const btnOpenProf = document.getElementById("btn-open-profile");
  if(btnOpenProf) btnOpenProf.addEventListener("click", () => {
    document.getElementById("edit-fullname").value = currentUser.fullname || "";
    document.getElementById("edit-username").value = currentUser.username || "";
    document.getElementById("edit-phone").value = currentUser.phone || "";
    document.getElementById("edit-bank").value = currentUser.bank || "";
    document.getElementById("edit-acc-name").value = currentUser.accountName || "";
    document.getElementById("edit-acc-num").value = currentUser.accountNumber || "";
    openModal('modal-profil');
  });

  const btnSaveProf = document.getElementById("btn-save-profile");
  if(btnSaveProf) {
    btnSaveProf.addEventListener("click", function() {
      const updatedData = {
        fullname: document.getElementById("edit-fullname").value.trim(),
        phone: document.getElementById("edit-phone").value.trim(),
        bank: document.getElementById("edit-bank").value.trim(),
        accountName: document.getElementById("edit-acc-name").value.trim(),
        accountNumber: document.getElementById("edit-acc-num").value.trim()
      };
      db.ref("users/" + currentUser.username).update(updatedData, (err) => {
        if(!err) {
          alert("🎉 Profil berhasil diperbarui!");
          closeModal('modal-profil');
        } else {
          alert("Gagal memperbarui profil: " + err.message);
        }
      });
    });
  }

  document.querySelectorAll(".btn-close-modal").forEach(btn => {
    btn.addEventListener("click", function() {
      closeModal(this.getAttribute("data-modal"));
    });
  });

  const navBeranda = document.getElementById("nav-btn-beranda");
  const navAktivitas = document.getElementById("nav-btn-aktivitas");
  const navIsiSaldo = document.getElementById("nav-btn-isisaldo");
  const navChat = document.getElementById("nav-btn-chat");
  const navSettings = document.getElementById("nav-btn-settings");

  if(navBeranda) navBeranda.addEventListener("click", function() { switchNav('beranda', this); });
  if(navAktivitas) navAktivitas.addEventListener("click", function() { switchNav('aktivitas', this); });
  if(navIsiSaldo) navIsiSaldo.addEventListener("click", function() { switchNav('isisaldo', document.getElementById('nav-dummy')); });
  if(navChat) navChat.addEventListener("click", function() { switchNav('chat', this); });
  if(navSettings) navSettings.addEventListener("click", () => openModal('modal-app-settings'));

  const btnKirim = document.getElementById("btn-act-kirim");
  const btnMinta = document.getElementById("btn-act-minta");
  const btnPinjam = document.getElementById("btn-act-pinjam");
  const btnTarik = document.getElementById("btn-sec-tarik");
  const btnRekap = document.getElementById("btn-sec-rekap");
  const btnPertemanan = document.getElementById("btn-sec-pertemanan");

  const checkAccess = () => {
    if (currentUser.status === "banned") { alert("🚨 Akun diblokir."); return false; }
    if (currentUser.status !== "active") { alert("⚠️ Selesaikan setoran awal min. Rp 50.000 terlebih dahulu."); return false; }
    return true;
  };

  if(btnKirim) btnKirim.addEventListener("click", () => { if(checkAccess()) openModal('modal-kirim'); });
  if(btnMinta) btnMinta.addEventListener("click", () => { if(checkAccess()) openModal('modal-minta'); });
  if(btnPinjam) btnPinjam.addEventListener("click", () => { if(checkAccess()) openModal('modal-pinjam'); });
  if(btnTarik) btnTarik.addEventListener("click", () => { if(checkAccess()) openModal('modal-tarik'); });
  if(btnRekap) btnRekap.addEventListener("click", () => { showMonthlySummary(); openModal('modal-rekap'); });
  if(btnPertemanan) btnPertemanan.addEventListener("click", () => { loadFriendRequests(); loadFriendsList(); openModal('modal-pertemanan'); });

  const btnSubTopup = document.getElementById("btn-submit-topup");
  const btnSubKirim = document.getElementById("btn-submit-kirim");
  const btnSubMinta = document.getElementById("btn-submit-minta");
  const btnSubPinjam = document.getElementById("btn-submit-pinjam");
  const btnSubTarik = document.getElementById("btn-submit-tarik");
  const btnSendFriendReq = document.getElementById("btn-send-friend-req");

  if(btnSubTopup) btnSubTopup.addEventListener("click", submitTopupQRIS);
  if(btnSubKirim) btnSubKirim.addEventListener("click", submitKirimSaldo);
  if(btnSubMinta) btnSubMinta.addEventListener("click", submitMintaSaldo);
  if(btnSubPinjam) btnSubPinjam.addEventListener("click", submitPinjamSaldo);
  if(btnSubTarik) btnSubTarik.addEventListener("click", submitTarikSaldo);
  if(btnSendFriendReq) btnSendFriendReq.addEventListener("click", sendFriendRequest);

  const friendSelector = document.getElementById("friend-chat-selector");
  if(friendSelector) friendSelector.addEventListener("change", function() {
    const friendName = this.value;
    const inputArea = document.getElementById("friend-chat-input-area");
    if(friendName) {
      inputArea.style.display = "flex";
      listenFriendChat(friendName);
    } else {
      inputArea.style.display = "none";
      document.getElementById("friend-chat-box").innerHTML = `<div class="empty-state">Pilih teman di atas untuk mulai mengobrol.</div>`;
    }
  });

  const btnSendFriendChat = document.getElementById("btn-send-friend-chat");
  if(btnSendFriendChat) btnSendFriendChat.addEventListener("click", sendFriendChat);

  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if(btnThemeToggle) btnThemeToggle.addEventListener("click", toggleThemeMode);

  const btnLogout = document.getElementById("btn-app-logout");
  if(btnLogout) btnLogout.addEventListener("click", logoutUser);
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function switchNav(viewName, btnEl) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('view-' + viewName).classList.remove('hidden');
  if(btnEl) btnEl.classList.add('active');
}

function toggleBalanceHide() {
  isBalanceHidden = !isBalanceHidden;
  const eyeBtn = document.getElementById("btn-eye-balance");
  const valBal = document.getElementById("val-balance");
  if (isBalanceHidden) {
    eyeBtn.innerText = "🙈";
    valBal.innerText = "Rp ••••••••";
  } else {
    eyeBtn.innerText = "👁️";
    valBal.innerText = "Rp " + (currentUser.balance || 0).toLocaleString('id-ID');
  }
}

function toggleThemeMode() {
  document.body.classList.toggle("light-mode");
  const btn = document.getElementById("btn-theme-toggle");
  btn.innerText = document.body.classList.contains("light-mode") ? "☀️ Mode Terang" : "🌙 Mode Gelap";
}

function submitTopupQRIS() {
  const amount = parseInt(document.getElementById("topup-amount").value);
  if (!amount || amount <= 0) return alert("Masukkan nominal valid!");
  pushTransaction("Nabung", amount, currentUser.username, "SYSTEM", "Pending");
  document.getElementById("topup-amount").value = "";
}

function submitKirimSaldo() {
  const targetUser = document.getElementById("send-target-user").value.trim().toLowerCase().replace("@", "");
  const amount = parseInt(document.getElementById("send-amount").value);
  const note = document.getElementById("send-note").value.trim() || "-";

  if (!targetUser || !amount || amount <= 0) return alert("Lengkapi data transfer!");
  if (targetUser === currentUser.username.toLowerCase()) return alert("Tidak bisa kirim ke akun sendiri!");
  if (amount > (currentUser.balance || 0)) return alert("Saldo tidak mencukupi!");

  db.ref("users/" + targetUser).once("value", (snap) => {
    if (!snap.exists()) return alert(`Username @${targetUser} tidak ditemukan!`);
    
    let senderNewBal = currentUser.balance - amount;
    db.ref("users/" + currentUser.username).update({ balance: senderNewBal });
    
    db.ref("users/" + targetUser).once("value", (s) => {
      let targetBal = Number(s.val().balance) || 0;
      db.ref("users/" + targetUser).update({ balance: targetBal + amount });
    });

    const timeStr = new Date().toLocaleString('id-ID');
    const rawDate = new Date().toISOString().split('T')[0];

    db.ref("transactions").push({
      username: currentUser.username,
      targetUser: targetUser,
      type: `Transfer ke @${targetUser}`,
      amount: amount,
      note: note,
      status: "Disetujui",
      time: timeStr,
      rawDate: rawDate
    });

    alert(`🎉 Transfer Rp ${amount.toLocaleString('id-ID')} ke @${targetUser} berhasil!`);
    closeModal('modal-kirim');
    document.getElementById("send-target-user").value = "";
    document.getElementById("send-amount").value = "";
    document.getElementById("send-note").value = "";
  });
}

function submitMintaSaldo() {
  const targetUser = document.getElementById("minta-target-user").value.trim().toLowerCase().replace("@", "");
  const amount = parseInt(document.getElementById("minta-amount").value);

  if (!targetUser || !amount || amount <= 0) return alert("Lengkapi data permintaan saldo!");
  if (targetUser === currentUser.username.toLowerCase()) return alert("Tidak bisa meminta saldo ke diri sendiri!");

  db.ref("users/" + targetUser).once("value", (snap) => {
    if (!snap.exists()) return alert(`Username @${targetUser} tidak ditemukan!`);

    const timeStr = new Date().toLocaleString('id-ID');
    const rawDate = new Date().toISOString().split('T')[0];

    db.ref("transactions").push({
      username: targetUser,
      requester: currentUser.username,
      type: `Permintaan Saldo dari @${currentUser.username}`,
      amount: amount,
      status: "Pending",
      time: timeStr,
      rawDate: rawDate
    }, (err) => {
      if (!err) {
        alert(`Berhasil mengirim permintaan saldo Rp ${amount.toLocaleString('id-ID')} ke @${targetUser}. Menunggu persetujuan.`);
        closeModal('modal-minta');
        document.getElementById("minta-target-user").value = "";
        document.getElementById("minta-amount").value = "";
      }
    });
  });
}

function renderPendingMoneyRequests() {
  const historyBox = document.getElementById("list-recent-history");
  let html = "";

  globalTransactions.forEach(t => {
    if (t.username === currentUser.username && t.status === "Pending" && t.requester) {
      html += `
        <div class="list-item" style="background: rgba(245, 158, 11, 0.1); border-color: #f59e0b;">
          <div>
            <div style="font-size: 13px; font-weight: 600; color: #f59e0b;">${t.type}</div>
            <div style="font-size: 10px; color: #94a3b8;">📅 ${t.time}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 700;">Rp ${Number(t.amount).toLocaleString('id-ID')}</div>
            <div style="margin-top: 5px; display: flex; gap: 5px;">
              <button class="btn-action btn-acc" onclick="accMoneyRequest('${t.id}')">ACC</button>
              <button class="btn-action btn-reject" onclick="rejMoneyRequest('${t.id}')">Tolak</button>
            </div>
          </div>
        </div>`;
    }
  });

  globalTransactions.forEach(t => {
    if (t.status !== "Pending" || !t.requester) {
      let color = t.status === 'Disetujui' ? '#4ade80' : '#f87171';
      html += `
        <div class="list-item">
          <div>
            <div style="font-size: 13px; font-weight: 600;">${t.type}</div>
            <div style="font-size: 10px; color: #94a3b8;">📅 ${t.time}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 700;">Rp ${Number(t.amount).toLocaleString('id-ID')}</div>
            <div style="font-size: 10px; color: ${color}; font-weight: 600;">${t.status}</div>
          </div>
        </div>`;
    }
  });

  if (globalTransactions.length === 0) {
    historyBox.innerHTML = `<div class="empty-state">Belum ada riwayat transaksi.</div>`;
  } else {
    historyBox.innerHTML = html;
  }
}

function accMoneyRequest(trxId) {
  db.ref("transactions/" + trxId).once("value", (snap) => {
    if (!snap.exists()) return;
    const t = snap.val();
    const amount = Number(t.amount);
    const requester = t.requester;

    if (currentUser.balance < amount) {
      return alert("Saldo Anda tidak mencukupi untuk menyetujui permintaan ini!");
    }

    let newMyBalance = currentUser.balance - amount;
    db.ref("users/" + currentUser.username).update({ balance: newMyBalance });

    db.ref("users/" + requester).once("value", (s) => {
      if (s.exists()) {
        let reqBal = Number(s.val().balance) || 0;
        db.ref("users/" + requester).update({ balance: reqBal + amount });
      }
    });

    db.ref("transactions/" + trxId).update({ status: "Disetujui", type: `Minta Saldo ke @${currentUser.username} (Disetujui)` });

    db.ref("transactions").push({
      username: requester,
      type: `Permintaan Saldo ke @${currentUser.username} Disetujui`,
      amount: amount,
      status: "Disetujui",
      time: new Date().toLocaleString('id-ID'),
      rawDate: new Date().toISOString().split('T')[0]
    });

    alert("🎉 Permintaan saldo berhasil disetujui!");
  });
}

function rejMoneyRequest(trxId) {
  db.ref("transactions/" + trxId).update({ status: "Ditolak", type: `Permintaan Saldo Ditolak` });
  alert("Permintaan saldo ditolak.");
}

function submitPinjamSaldo() {
  const amount = parseInt(document.getElementById("loan-amount").value);
  const reason = document.getElementById("loan-reason").value.trim();
  if (!amount || !reason) return alert("Lengkapi data pinjaman!");
  pushTransaction(`Pinjaman (${reason})`, amount, currentUser.username, "ADMIN", "Pending");
  closeModal('modal-pinjam');
}

function submitTarikSaldo() {
  const amount = parseInt(document.getElementById("withdraw-amount").value);
  if (!amount || amount <= 0) return alert("Masukkan nominal!");
  if (amount > currentUser.balance) return alert("Saldo tidak cukup!");
  pushTransaction("Tarik Saldo", amount, currentUser.username, "ADMIN", "Pending");
  closeModal('modal-tarik');
}

function pushTransaction(type, amount, username, targetUser, status) {
  db.ref("transactions").push({
    username: username,
    targetUser: targetUser,
    type: type,
    amount: amount,
    status: status,
    time: new Date().toLocaleString('id-ID'),
    rawDate: new Date().toISOString().split('T')[0]
  }, (err) => {
    if (!err) alert("Permintaan berhasil dikirim!");
  });
}

function showMonthlySummary() {
  const box = document.getElementById("rekap-content-box");
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);

  let totalMasuk = 0;
  let totalKeluar = 0;

  globalTransactions.forEach(t => {
    if (t.status === "Disetujui" && t.rawDate) {
      let tDate = new Date(t.rawDate);
      if (tDate >= oneMonthAgo && tDate <= now) {
        let amt = Number(t.amount) || 0;
        if (t.username === currentUser.username && (t.type.includes("Transfer") || t.type.includes("Minta") || t.type.includes("Tarik"))) {
          totalKeluar += amt;
        } else {
          totalMasuk += amt;
        }
      }
    }
  });

  box.innerHTML = `
    <div class="log-info-box"><div class="log-label">Total Pemasukan (1 Bulan Terakhir):</div><div class="log-value-success">Rp ${totalMasuk.toLocaleString('id-ID')}</div></div>
    <div class="log-info-box"><div class="log-label">Total Pengeluaran (1 Bulan Terakhir):</div><div class="log-value-primary" style="color: #f87171;">Rp ${totalKeluar.toLocaleString('id-ID')}</div></div>
  `;
}

function sendFriendRequest() {
  const target = document.getElementById("friend-username-input").value.trim().toLowerCase().replace("@", "");
  if (!target) return alert("Masukkan username teman!");
  if (target === currentUser.username.toLowerCase()) return alert("Tidak bisa berteman dengan diri sendiri!");

  db.ref("users/" + target).once("value", (snap) => {
    if (!snap.exists()) return alert(`Username @${target} tidak ditemukan!`);

    db.ref(`friends/${currentUser.username}/${target}`).once("value", (fSnap) => {
      if (fSnap.exists() && fSnap.val().status === "accepted") {
        return alert("Anda sudah berteman dengan pengguna ini!");
      }

      db.ref(`friend_requests/${target}/${currentUser.username}`).set({
        requester: currentUser.username,
        time: new Date().toLocaleString('id-ID'),
        status: "pending"
      }, (err) => {
        if (!err) {
          alert(`Permintaan pertemanan terkirim ke @${target}!`);
          document.getElementById("friend-username-input").value = "";
        }
      });
    });
  });
}

function loadFriendRequests() {
  const list = document.getElementById("friend-requests-list");
  db.ref(`friend_requests/${currentUser.username}`).on("value", (snap) => {
    const reqs = snap.val();
    if (!reqs) {
      list.innerHTML = `<div class="empty-state">Tidak ada permintaan pertemanan.</div>`;
      return;
    }

    let html = "";
    Object.keys(reqs).forEach(reqUser => {
      if (reqs[reqUser].status === "pending") {
        html += `
          <div class="list-item" style="padding: 8px 12px;">
            <div><b>@${reqUser}</b></div>
            <div style="display: flex; gap: 5px;">
              <button class="btn-action btn-acc" onclick="acceptFriend('${reqUser}')">Terima</button>
              <button class="btn-action btn-reject" onclick="rejectFriend('${reqUser}')">Tolak</button>
            </div>
          </div>`;
      }
    });
    list.innerHTML = html || `<div class="empty-state">Tidak ada permintaan pertemanan.</div>`;
  });
}

function acceptFriend(friendUser) {
  const updates = {};
  updates[`friends/${currentUser.username}/${friendUser}/status`] = "accepted";
  updates[`friends/${friendUser}/${currentUser.username}/status`] = "accepted";
  updates[`friend_requests/${currentUser.username}/${friendUser}`] = null;

  db.ref().update(updates, (err) => {
    if (!err) {
      alert(`Anda sekarang berteman dengan @${friendUser}!`);
      loadFriendsList();
    }
  });
}

function rejectFriend(friendUser) {
  db.ref(`friend_requests/${currentUser.username}/${friendUser}`).remove();
  alert("Permintaan pertemanan ditolak.");
}

function loadFriendsList() {
  const friendBox = document.getElementById("friend-list-box");
  const friendSelector = document.getElementById("friend-chat-selector");

  db.ref(`friends/${currentUser.username}`).on("value", (snap) => {
    const friends = snap.val();
    if (!friends) {
      if(friendBox) friendBox.innerHTML = `<div class="empty-state">Belum ada teman.</div>`;
      if(friendSelector) friendSelector.innerHTML = `<option value="">-- Pilih Teman --</option>`;
      return;
    }

    let html = "";
    let selectHtml = `<option value="">-- Pilih Teman --</option>`;

    Object.keys(friends).forEach(fUser => {
      if (friends[fUser].status === "accepted") {
        html += `<div class="list-item" style="padding: 8px 12px;"><div><b>@${fUser}</b></div><span style="color: #4ade80; font-size: 11px;">Berteman</span></div>`;
        selectHtml += `<option value="${fUser}">@${fUser}</option>`;
      }
    });

    if(friendBox) friendBox.innerHTML = html || `<div class="empty-state">Belum ada teman.</div>`;
    if(friendSelector) friendSelector.innerHTML = selectHtml;
  });
}

function listenFriendChat(friendName) {
  const roomKey = [currentUser.username, friendName].sort().join("_");
  db.ref(`friend_chats/${roomKey}`).on("value", (snap) => {
    const box = document.getElementById("friend-chat-box");
    box.innerHTML = "";
    const msgs = snap.val();
    if (msgs) {
      Object.keys(msgs).forEach(k => {
        const m = msgs[k];
        box.innerHTML += `<div class="chat-bubble ${m.sender === currentUser.username ? 'chat-me' : 'chat-admin'}">${m.text}</div>`;
      });
      box.scrollTop = box.scrollHeight;
    } else {
      box.innerHTML = `<div class="empty-state">Mulai percakapan dengan @${friendName}!</div>`;
    }
  });
}

function sendFriendChat() {
  const friendName = document.getElementById("friend-chat-selector").value;
  const input = document.getElementById("friend-chat-input");
  if (!friendName || !input.value.trim()) return;

  const roomKey = [currentUser.username, friendName].sort().join("_");
  db.ref(`friend_chats/${roomKey}`).push({
    sender: currentUser.username,
    text: input.value.trim(),
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
  input.value = "";
}

function renderUserTransactions() {
  const listRecent = document.getElementById("list-recent-history");
  if(!listRecent) return;
  listRecent.innerHTML = "";
  let countRecent = 0;

  globalTransactions.forEach((t) => {
    let color = t.status === 'Disetujui' ? '#4ade80' : (t.status === 'Ditolak' ? '#f87171' : '#f59e0b');
    let html = `
      <div class="list-item">
        <div>
          <div style="font-size: 13px; font-weight: 600;">${t.type}</div>
          <div style="font-size: 10px; color: #94a3b8;">📅 ${t.time}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 700;">Rp ${Number(t.amount).toLocaleString('id-ID')}</div>
          <div style="font-size: 10px; color: ${color}; font-weight: 600;">${t.status}</div>
        </div>
      </div>`;

    if (countRecent < 5) { listRecent.innerHTML += html; countRecent++; }
  });

  if (globalTransactions.length === 0) {
    listRecent.innerHTML = `<div class="empty-state">Belum ada riwayat transaksi.</div>`;
  }
}

function logoutUser() {
  if (db && currentUser) {
    db.ref("users/" + currentUser.username).update({ isOnline: false });
  }
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "index.html";
}

// ==========================================
// 8. LOGIKA DASHBOARD ADMIN (DISEDERHANAKAN)
// ==========================================
function initAdminDashboard() {
  const session = JSON.parse(localStorage.getItem("loggedUser") || sessionStorage.getItem("loggedUser"));
  if (!session || (session.username !== "RhyoTama" && session.role !== "admin")) {
    window.location.href = "loginadmin.html";
    return;
  }
  bindAdminEvents();
  if (db) {
    db.ref("users").on("value", (snap) => { globalUsers = snap.val() || {}; updateAdminUserOptions(); renderAdminAllData(); });
    db.ref("transactions").on("value", (snap) => { globalTrxs = snap.val() || {}; renderAdminAllData(); });
  }
}

function bindAdminEvents() {
  const btnSidebarToggle = document.getElementById("btn-toggle-sidebar");
  if(btnSidebarToggle) btnSidebarToggle.addEventListener("click", () => document.getElementById('sidebar').classList.toggle('show'));

  const menuMap = [
    { btn: 'menu-btn-verifikasi', tab: 'tab-verifikasi', title: '1. Verifikasi Transaksi' },
    { btn: 'menu-btn-riwayat', tab: 'tab-riwayat', title: '2. Riwayat Transaksi' },
    { btn: 'menu-btn-rekap', tab: 'tab-rekap', title: '3. Rekap Saldo Warga' },
    { btn: 'menu-btn-chat', tab: 'tab-chat', title: '4. Layanan Live Chat' },
    { btn: 'menu-btn-moderasi', tab: 'tab-moderasi', title: '5. Moderasi Akun' },
    { btn: 'menu-btn-status', tab: 'tab-status', title: '6. Status Warga' },
    { btn: 'menu-btn-data-warga', tab: 'tab-data-warga', title: '7. Database Data Warga' }
  ];

  menuMap.forEach(item => {
    const el = document.getElementById(item.btn);
    if(el) {
      el.addEventListener("click", function() {
        document.querySelectorAll('.panel-section').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        document.getElementById(item.tab).classList.add('active');
        this.classList.add('active');
        document.getElementById('page-title').innerText = item.title;
        if (window.innerWidth <= 992) document.getElementById('sidebar').classList.remove('show');
      });
    }
  });

  const btnLogout = document.getElementById("btn-admin-logout");
  if(btnLogout) btnLogout.addEventListener("click", () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "loginadmin.html"; });
}

function clearAllTransactions() {
  if (confirm("⚠️ Hapus seluruh riwayat transaksi secara permanen?")) {
    db.ref("transactions").remove();
  }
}

function updateAdminUserOptions() {
  const filterSel = document.getElementById("filter-user-history");
  const chatSel = document.getElementById("chat-user-selector");
  if(!filterSel || !chatSel) return;

  let filterHtml = `<option value="ALL">-- Tampilkan Semua Warga --</option>`;
  let chatHtml = "";
  Object.keys(globalUsers).forEach(username => {
    const u = globalUsers[username];
    if (u.role !== 'admin') {
      let nameLabel = `${u.fullname || username} (@${username})`;
      filterHtml += `<option value="${username}">${nameLabel}</option>`;
      chatHtml += `<option value="${username}">${nameLabel}</option>`;
    }
  });
  filterSel.innerHTML = filterHtml; chatSel.innerHTML = chatHtml;
}

function renderAdminAllData() {
  let totalKasTabungan = 0;
  let countPending = 0;
  const filterSel = document.getElementById("filter-user-history");
  const selectedUserFilter = filterSel ? filterSel.value : "ALL";
  
  const tbVerif = document.getElementById("tb-verifikasi"); if(tbVerif) tbVerif.innerHTML = "";
  const tbRiwayat = document.getElementById("tb-riwayat-all"); if(tbRiwayat) tbRiwayat.innerHTML = "";

  Object.keys(globalTrxs).reverse().forEach(key => {
    const trx = globalTrxs[key];
    if (!trx) return;
    if (trx.status === 'Pending') {
      countPending++;
      if(tbVerif) {
        tbVerif.innerHTML += `
          <tr>
            <td>${trx.time || '-'}</td>
            <td><b>@${trx.username || '-'}</b></td>
            <td><b>${trx.type}</b></td>
            <td>Rp ${(Number(trx.amount)||0).toLocaleString('id-ID')}</td>
            <td><span class="badge badge-pending">${trx.status}</span></td>
            <td>
              <button class="btn-action btn-acc" onclick="accTrx('${key}')">ACC</button> 
              <button class="btn-action btn-reject" onclick="rejTrx('${key}')">Tolak</button>
            </td>
          </tr>`;
      }
    } else {
      if (selectedUserFilter === "ALL" || selectedUserFilter === trx.username) {
        tbRiwayat.innerHTML += `
          <tr>
            <td>${trx.time || '-'}</td>
            <td><b>@${trx.username || '-'}</b></td>
            <td><b>${trx.type}</b></td>
            <td>Rp ${(Number(trx.amount)||0).toLocaleString('id-ID')}</td>
            <td><span class="badge badge-success">${trx.status}</span></td>
            <td><button class="btn-action btn-del" onclick="deleteTrx('${key}')">Hapus</button></td>
          </tr>`;
      }
    }
  });

  if (tbVerif && countPending === 0) tbVerif.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tidak ada transaksi pending.</td></tr>`;
  
  const tbSaldo = document.getElementById("tb-saldo"); if(tbSaldo) tbSaldo.innerHTML = "";
  const tbMod = document.getElementById("tb-mod"); if(tbMod) tbMod.innerHTML = "";
  const tbStatus = document.getElementById("tb-status-warga"); if(tbStatus) tbStatus.innerHTML = "";
  const tbDataWarga = document.getElementById("tb-datawarga"); if(tbDataWarga) tbDataWarga.innerHTML = "";

  Object.keys(globalUsers).forEach(username => {
    const u = globalUsers[username];
    if (u && u.role !== 'admin') {
      totalKasTabungan += (Number(u.balance) || 0);
      if (tbSaldo) tbSaldo.innerHTML += `<tr><td><b>@${username}</b></td><td style="color:#10b981;">Rp ${(Number(u.balance)||0).toLocaleString('id-ID')}</td><td><button class="btn-action btn-acc" onclick="editSaldo('${username}')">Edit Saldo</button></td></tr>`;
      if (tbMod) tbMod.innerHTML += `<tr><td><b>@${username}</b></td><td><span class="badge ${u.status==='banned'?'badge-danger':'badge-success'}">${u.status||'active'}</span></td><td>${u.warning||'-'}</td><td><button class="btn-action ${u.status==='active'?'btn-reject':'btn-acc'}" onclick="toggleBan('${username}', '${u.status==='active'?'banned':'active'}')">${u.status==='active'?'Ban':'Unban'}</button></td></tr>`;
      if (tbStatus) tbStatus.innerHTML += `<tr><td>${u.fullname||'-'}</td><td>@${username}</td><td>${u.lastLogin||'-'}</td><td><span class="badge ${u.isOnline?'badge-success':'badge-danger'}">${u.isOnline?'Online':'Offline'}</span></td></tr>`;
      if (tbDataWarga) tbDataWarga.innerHTML += `<tr><td>${u.fullname||'-'}</td><td>@${username}</td><td>${u.email||'-'}</td><td>${u.phone||'-'}</td><td>${u.birthPlace||'-'}</td><td>${u.bank||'-'}</td><td>${u.accountName||'-'}</td><td>${u.accountNumber||'-'}</td><td>${u.birthDate||'-'}</td><td>${u.motherName||'-'}</td><td>******</td></tr>`;
    }
  });

  document.getElementById("m-kas-tabungan").innerText = "Rp " + totalKasTabungan.toLocaleString('id-ID');
  document.getElementById("m-pending").innerText = countPending;
}

function accTrx(trxKey) {
  const trx = globalTrxs[trxKey];
  if (!trx) return;
  const uData = globalUsers[trx.username];
  let bal = Number(uData.balance) || 0;

  if (trx.type === "Nabung") {
    bal += Number(trx.amount);
    let updates = { balance: bal };
    if (Number(trx.amount) >= 50000) updates.status = "active";
    db.ref("users/" + trx.username).update(updates);
  }
  db.ref("transactions/" + trxKey).update({ status: "Disetujui" }, () => alert("Transaksi di-ACC!"));
}

function rejTrx(trxKey) { db.ref("transactions/" + trxKey).update({ status: "Ditolak" }); }
function deleteTrx(trxKey) { db.ref("transactions/" + trxKey).remove(); }
function editSaldo(username) {
  let nb = prompt("Edit Saldo (Rp):");
  if(nb !== null) db.ref("users/" + username).update({ balance: parseInt(nb) || 0 });
}
function toggleBan(username, status) { db.ref("users/" + username).update({ status: status }); }

// ==========================================
// 9. AUTO POP-UP NOTIFIKASI PENCAIRAN SALDO (TOAST)
// ==========================================
const mockWargaList = [
  { name: "Darwin Simanjuntak", amount: 100000 },
  { name: "Halimah", amount: 150000 },
  { name: "Fadilah", amount: 100000 },
  { name: "Hanifah", amount: 150000 },
  { name: "Husnawati", amount: 100000 },
  { name: "Hasbi", amount: 150000 },
  { name: "Bambang Nopiyadi", amount: 100000 },
  { name: "Irfansyah", amount: 150000 },
  { name: "Handoko Saputra", amount: 100000 }
];

let lastToastIndex = -1;

function triggerWithdrawalToast() {
  const toastEl = document.getElementById("toast-withdrawal");
  const toastText = document.getElementById("toast-withdrawal-text");

  if (!toastEl || !toastText) return;

  let randomIndex = Math.floor(Math.random() * mockWargaList.length);
  if (randomIndex === lastToastIndex) {
    randomIndex = (randomIndex + 1) % mockWargaList.length;
  }
  lastToastIndex = randomIndex;

  const data = mockWargaList[randomIndex];
  toastText.innerHTML = `<b>${data.name}</b> baru saja mencairkan saldo <b style="color:#10b981;">Rp ${data.amount.toLocaleString('id-ID')}</b>`;

  toastEl.classList.remove("hidden");
  setTimeout(() => { 
    toastEl.classList.add("hidden"); 
  }, 5000);
}

function startWithdrawalToastLoop() {
  setTimeout(() => {
    triggerWithdrawalToast();
    setInterval(triggerWithdrawalToast, 15000);
  }, 2000);
}
