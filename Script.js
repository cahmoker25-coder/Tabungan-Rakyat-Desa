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
  
  // Realtime Clock
  const timeEl = document.getElementById('current-time');
  if (timeEl) {
    const updateClock = () => {
      const now = new Date();
      timeEl.innerText = now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' });
    };
    setInterval(updateClock, 1000);
    updateClock();
  }

  // A. Inisialisasi Auth Page (index.html)
  const boxLogin = document.getElementById("box-login");
  if (boxLogin) {
    const session = JSON.parse(localStorage.getItem("loggedUser") || sessionStorage.getItem("loggedUser"));
    if (session && session.role !== "admin") {
      window.location.href = "user-dashboard.html";
      return;
    }

    if(typeof setupPinInputs === 'function') {
      setupPinInputs('pin-reg');
      setupPinInputs('pin-conf-reg');
      setupPinInputs('pin-forget');
    }
    
    if(typeof initRealtimePasswordCheck === 'function') {
      initRealtimePasswordCheck("reg-password", "reg-confirm-password", "pass-match-status", "rule-");
      initRealtimePasswordCheck("forget-new-pass", "forget-conf-pass", "forget-match-status", "forget-rule-");
    }
    
    if(typeof initUsernameAutoSuggest === 'function') initUsernameAutoSuggest();
    if(typeof initLoginUserHandler === 'function') initLoginUserHandler();
    if(typeof initRegisterUserHandler === 'function') initRegisterUserHandler();
  }

  // B. Inisialisasi User Dashboard (user-dashboard.html)
  const valBalance = document.getElementById("val-balance");
  if (valBalance) {
    initUserDashboard();
    startWithdrawalToastLoop();
  }

  // C. Inisialisasi Admin Dashboard (admin.html)
  const tbVerif = document.getElementById("tb-verifikasi");
  if (tbVerif) {
    initAdminDashboard();
  }
});

// ==========================================
// 3. LOGIKA VALIDASI SANDI
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

  if (passInput) {
    passInput.addEventListener("input", function () {
      const v = passInput.value;
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

function setupPinInputs(className) {
  const pinInputs = document.querySelectorAll('.' + className);
  pinInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && index < pinInputs.length - 1) pinInputs[index + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) pinInputs[index - 1].focus();
    });
  });
}

function getPinValue(className) {
  let pin = "";
  document.querySelectorAll('.' + className).forEach(input => { pin += input.value.trim(); });
  return pin;
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
      const email = document.getElementById("reg-email").value.trim();
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
      const pin = getPinValue('pin-reg');
      const confirmPin = getPinValue('pin-conf-reg');

      const username = document.getElementById("reg-username").value.trim().toLowerCase();
      const password = document.getElementById("reg-password").value;
      const confirmPassword = document.getElementById("reg-confirm-password").value;

      if (phone.length < 10) return alert("Nomor HP minimal 10 angka!");
      if (pin.length < 6 || confirmPin.length < 6) return alert("PIN Transaksi harus 6 angka!");
      if (pin !== confirmPin) return alert("Konfirmasi PIN tidak cocok!");

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
            pin: pin, password: password, role: "user", balance: 100000, status: "pending_verification",
            isOnline: false, muted: false, warning: "", lastLogin: "-", createdAt: new Date().toLocaleString("id-ID")
          };

          db.ref("users/" + username).set(newUserObject, (err) => {
            if (err) alert("Gagal Mendaftar: " + err.message);
            else {
              alert("🎉 Pendaftaran Berhasil! Anda mendapatkan Bonus Saldo Rp 100.000. Lakukan setoran awal min. Rp 50.000 agar akun di-ACC Bendahara. Silakan login.");
              formDaftar.reset(); switchForm('login');
            }
          });
        }
      });
    });
  }
}

// ==========================================
// 5. LUPA PASSWORD
// ==========================================
let resetUserData = null;
function resetForgetForm() {
  resetUserData = null;
  const sub = document.getElementById("forget-step-subtitle");
  if (sub) sub.innerText = "Langkah 1: Verifikasi Username";
  
  ["forget-step-1","forget-step-2","forget-step-3","forget-step-4","forget-step-5"].forEach((id, idx) => {
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
    document.getElementById("forget-step-subtitle").innerText = "Langkah 2: Verifikasi Ibu Kandung";
  });
}

function resetStep2() {
  const mother = document.getElementById("forget-mother").value.trim().toLowerCase();
  if (!mother) return alert("Masukkan nama ibu kandung!");
  if (resetUserData.motherName === mother || resetUserData.mother === mother) {
    document.getElementById("forget-step-2").classList.add("hidden");
    document.getElementById("forget-step-3").classList.remove("hidden");
    document.getElementById("forget-step-subtitle").innerText = "Langkah 3: Verifikasi Tanggal Lahir";
  } else { alert("Jawaban Nama Ibu Kandung SALAH!"); }
}

function resetStep3() {
  const day = document.getElementById("forget-dob-day").value;
  const month = document.getElementById("forget-dob-month").value;
  const year = document.getElementById("forget-dob-year").value;
  const inputDob = `${day}/${month}/${year}`;
  if (!day || !month || !year) return alert("Lengkapi tanggal lahir!");

  if (resetUserData.birthDate === inputDob) {
    document.getElementById("forget-step-3").classList.add("hidden");
    document.getElementById("forget-step-4").classList.remove("hidden");
    document.getElementById("forget-step-subtitle").innerText = "Langkah 4: Verifikasi Kota Kelahiran & PIN";
  } else { alert("Tanggal lahir tidak cocok dengan data terdaftar!"); }
}

function resetStep4() {
  const pob = document.getElementById("forget-pob").value.trim().toLowerCase();
  const inputPin = getPinValue('pin-forget');
  if (!pob) return alert("Masukkan kota kelahiran!");
  if (inputPin.length < 6) return alert("Masukkan 6 digit PIN Anda!");

  const userPob = (resetUserData.birthPlace || "").toLowerCase();
  if (userPob === pob && resetUserData.pin === inputPin) {
    document.getElementById("forget-step-4").classList.add("hidden");
    document.getElementById("forget-step-5").classList.remove("hidden");
    document.getElementById("forget-step-subtitle").innerText = "Langkah 5: Buat Sandi Baru";
  } else { alert("Kota kelahiran atau PIN Transaksi SALAH!"); }
}

function resetStep5() {
  const newPass = document.getElementById("forget-new-pass").value;
  const confPass = document.getElementById("forget-conf-pass").value;
  const valRes = validateComplexPassword(newPass);
  
  if (!valRes.isValid) return alert("Peringatan Sandi Baru: Minimal 8 karakter dengan kombinasi Huruf Kapital, Huruf Kecil, Angka, dan Simbol (!?;:*&$,@)!");
  if (newPass !== confPass) return alert("Peringatan: Konfirmasi sandi baru tidak cocok dengan sandi baru di atas!");

  db.ref("users/" + resetUserData.username).update({ password: newPass }, (err) => {
    if (!err) { alert("🎉 Kata Sandi Berhasil Diubah! Silakan login dengan sandi baru Anda."); switchForm('login'); }
    else { alert("Gagal memperbarui sandi: " + err.message); }
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
// 7. DASHBOARD USER
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
      document.getElementById("val-fullname").innerText = currentUser.fullname || currentUser.username;
      if (!isBalanceHidden) {
        document.getElementById("val-balance").innerText = "Rp " + (currentUser.balance || 0).toLocaleString('id-ID');
      }
      
      const pFull = document.getElementById("prof-fullname"); if(pFull) pFull.innerText = currentUser.fullname || "-";
      const pUser = document.getElementById("prof-username"); if(pUser) pUser.innerText = "@" + (currentUser.username || "-");
      const pMail = document.getElementById("prof-email"); if(pMail) pMail.innerText = currentUser.email || "-";
      const pPhone = document.getElementById("prof-phone"); if(pPhone) pPhone.innerText = currentUser.phone || "-";
      
      const pBank = document.getElementById("prof-bank"); if(pBank) pBank.innerText = currentUser.bank || "-";
      const pAccName = document.getElementById("prof-acc-name"); if(pAccName) pAccName.innerText = currentUser.accountName || "-";
      const pAccNum = document.getElementById("prof-acc-num"); if(pAccNum) pAccNum.innerText = currentUser.accountNumber || "-";

      const pPob = document.getElementById("prof-pob"); if(pPob) pPob.innerText = currentUser.birthPlace || "-";
      const pDob = document.getElementById("prof-dob"); if(pDob) pDob.innerText = currentUser.birthDate || "-";
      const pLast = document.getElementById("log-last-login"); if(pLast) pLast.innerText = currentUser.lastLogin || "Baru Saja";

      // Sinkronisasi status aktif log aktivitas
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

  db.ref("arisan_winner").on("value", (snap) => {
    const banner = document.getElementById("banner-arisan");
    const winName = document.getElementById("winner-name");
    if (snap.exists() && snap.val()) {
      if(winName) winName.innerText = snap.val();
      if(banner) banner.classList.remove("hidden");
    } else {
      if(banner) banner.classList.add("hidden");
    }
  });

  bindUserEvents();

  db.ref("transactions").on("value", (snap) => {
    const trxs = snap.val();
    globalTransactions = [];
    if (trxs) {
      Object.keys(trxs).reverse().forEach(key => {
        const t = trxs[key];
        if (t.username === currentUser.username) globalTransactions.push(t);
      });
    }
    renderUserTransactions();
    renderFilteredUserHistory();
  });

  listenUserChat();

  // Handler Tutup Browser / Tab (Set Offline)
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
    // Isi input form profil dengan data current
    document.getElementById("edit-fullname").value = currentUser.fullname || "";
    document.getElementById("edit-username").value = currentUser.username || "";
    document.getElementById("edit-phone").value = currentUser.phone || "";
    document.getElementById("edit-bank").value = currentUser.bank || "";
    document.getElementById("edit-acc-name").value = currentUser.accountName || "";
    document.getElementById("edit-acc-num").value = currentUser.accountNumber || "";
    document.getElementById("edit-pob").value = currentUser.birthPlace || "";
    document.getElementById("edit-dob").value = currentUser.birthDate || "";
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
        accountNumber: document.getElementById("edit-acc-num").value.trim(),
        birthPlace: document.getElementById("edit-pob").value.trim(),
        birthDate: document.getElementById("edit-dob").value.trim()
      };

      db.ref("users/" + currentUser.username).update(updatedData, (err) => {
        if(!err) {
          alert("🎉 Profil berhasil diperbarui dan disinkronkan ke database admin!");
          closeModal('modal-profil');
        } else {
          alert("Gagal memperbarui profil: " + err.message);
        }
      });
    });
  }

  document.querySelectorAll(".btn-close-modal").forEach(btn => {
    btn.addEventListener("click", function() {
      const targetModal = this.getAttribute("data-modal");
      closeModal(targetModal);
    });
  });

  // Navigasi Bottom Bar
  const navBeranda = document.getElementById("nav-btn-beranda");
  const navAktivitas = document.getElementById("nav-btn-aktivitas");
  const navIsiSaldo = document.getElementById("nav-btn-isisaldo");
  const navChat = document.getElementById("nav-btn-chat");
  const navSettings = document.getElementById("nav-btn-settings");

  if(navBeranda) navBeranda.addEventListener("click", function() { switchNav('beranda', this); });
  if(navAktivitas) navAktivitas.addEventListener("click", function() { switchNav('aktivitas', this); });
  if(navIsiSaldo) navIsiSaldo.addEventListener("click", function() { switchNav('isisaldo', document.getElementById('nav-dummy')); });
  if(navChat) navChat.addEventListener("click", function() { switchNav('chat', this); });
  
  if(navSettings) {
    navSettings.addEventListener("click", function() {
      openModal('modal-app-settings');
    });
  }

  // FAQ & About Modals
  const btnFaq = document.getElementById("btn-faq");
  if(btnFaq) btnFaq.addEventListener("click", () => { closeModal('modal-app-settings'); openModal('modal-faq'); });

  const btnAbout = document.getElementById("btn-about");
  if(btnAbout) btnAbout.addEventListener("click", () => { closeModal('modal-app-settings'); openModal('modal-about'); });

  // 4 Tombol Utama
  const btnKirim = document.getElementById("btn-act-kirim");
  const btnArisan = document.getElementById("btn-act-arisan");
  const btnPinjam = document.getElementById("btn-act-pinjam");
  const btnRiwayat = document.getElementById("btn-act-riwayat");

  if(btnKirim) btnKirim.addEventListener("click", () => {
    if(currentUser.status !== "active") return alert("Akses Transaksi Terkunci: Akun Anda belum terverifikasi (Belum melakukan setoran awal min. Rp 50.000 atau menunggu ACC Bendahara).");
    openModal('modal-kirim');
  });
  if(btnArisan) btnArisan.addEventListener("click", payArisanAuto);
  if(btnPinjam) btnPinjam.addEventListener("click", () => {
    if(currentUser.status !== "active") return alert("Akses Transaksi Terkunci: Selesaikan setoran awal min. Rp 50.000 terlebih dahulu.");
    openModal('modal-pinjam');
  });
  if(btnRiwayat) btnRiwayat.addEventListener("click", () => switchNav('history', document.querySelectorAll('.nav-btn')[3]));

  // 4 Tombol Sekunder
  const btnTarik = document.getElementById("btn-sec-tarik");
  const btnIuran = document.getElementById("btn-sec-iuran");
  const btnSumbangan = document.getElementById("btn-sec-sumbangan");
  const btnZakat = document.getElementById("btn-sec-zakat");

  if(btnTarik) btnTarik.addEventListener("click", () => {
    if(currentUser.status !== "active") return alert("Akses Transaksi Terkunci: Silakan lakukan setoran awal min. Rp 50.000 dan tunggu ACC Bendahara.");
    openModal('modal-tarik');
  });
  if(btnIuran) btnIuran.addEventListener("click", () => openModalSec('Iuran Warga'));
  if(btnSumbangan) btnSumbangan.addEventListener("click", () => openModalSec('Sumbangan Kas'));
  if(btnZakat) btnZakat.addEventListener("click", () => openModalSec('Zakat & Infaq'));

  // Form Submitters
  const btnSubTopup = document.getElementById("btn-submit-topup");
  const btnSubKirim = document.getElementById("btn-submit-kirim");
  const btnSubPinjam = document.getElementById("btn-submit-pinjam");
  const btnSubTarik = document.getElementById("btn-submit-tarik");
  const btnSubSec = document.getElementById("btn-submit-sec");
  const btnSendChat = document.getElementById("btn-send-chat");

  if(btnSubTopup) btnSubTopup.addEventListener("click", submitTopupQRIS);
  if(btnSubKirim) btnSubKirim.addEventListener("click", submitKirimSaldo);
  if(btnSubPinjam) btnSubPinjam.addEventListener("click", submitPinjamSaldo);
  if(btnSubTarik) btnSubTarik.addEventListener("click", submitTarikSaldo);
  if(btnSubSec) btnSubSec.addEventListener("click", submitSecondaryTransaction);
  if(btnSendChat) btnSendChat.addEventListener("click", sendChat);

  // Filter History Listeners
  const filterType = document.getElementById("filter-type");
  const filterStart = document.getElementById("filter-start-date");
  const filterEnd = document.getElementById("filter-end-date");
  if(filterType) filterType.addEventListener("change", renderFilteredUserHistory);
  if(filterStart) filterStart.addEventListener("change", renderFilteredUserHistory);
  if(filterEnd) filterEnd.addEventListener("change", renderFilteredUserHistory);

  const chatInput = document.getElementById("chat-input");
  if(chatInput) {
    chatInput.addEventListener("keypress", function(e) {
      if(e.key === "Enter") sendChat();
    });
  }

  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if(btnThemeToggle) btnThemeToggle.addEventListener("click", toggleThemeMode);

  const btnLogout = document.getElementById("btn-app-logout");
  if(btnLogout) btnLogout.addEventListener("click", logoutUser);
}

function openModal(id) {
  const el = document.getElementById(id);
  if(el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if(el) el.classList.add('hidden');
}

function switchNav(viewName, btnEl) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const targetView = document.getElementById('view-' + viewName);
  if(targetView) targetView.classList.remove('hidden');
  if(btnEl) btnEl.classList.add('active');
}

function toggleBalanceHide() {
  isBalanceHidden = !isBalanceHidden;
  const eyeBtn = document.getElementById("btn-eye-balance");
  const valBal = document.getElementById("val-balance");
  if (isBalanceHidden) {
    if(eyeBtn) eyeBtn.innerText = "🙈";
    if(valBal) valBal.innerText = "Rp ••••••••";
  } else {
    if(eyeBtn) eyeBtn.innerText = "👁️";
    if(valBal) valBal.innerText = "Rp " + (currentUser.balance || 0).toLocaleString('id-ID');
  }
}

function toggleThemeMode() {
  document.body.classList.toggle("light-mode");
  const btn = document.getElementById("btn-theme-toggle");
  if (document.body.classList.contains("light-mode")) {
    if(btn) btn.innerText = "☀️ Mode Terang";
  } else {
    if(btn) btn.innerText = "🌙 Mode Gelap";
  }
}

function submitTopupQRIS() {
  const topupInput = document.getElementById("topup-amount");
  if(!topupInput) return;
  const amount = parseInt(topupInput.value);
  if (!amount || amount <= 0) return alert("Masukkan nominal top-up yang valid!");
  pushTransaction("Nabung", amount);
  topupInput.value = "";
}

function submitKirimSaldo() {
  const targetUserInput = document.getElementById("send-target-user");
  const amountInput = document.getElementById("send-amount");
  const noteInput = document.getElementById("send-note");

  if (!targetUserInput || !amountInput) return;

  const targetUser = targetUserInput.value.trim().toLowerCase().replace("@", "");
  const amount = parseInt(amountInput.value);
  const note = noteInput ? noteInput.value.trim() : "";

  if (!targetUser || !amount || amount <= 0) return alert("Masukkan username penerima dan nominal transfer yang valid!");
  if (targetUser === currentUser.username.toLowerCase()) return alert("Anda tidak dapat mengirim saldo ke akun Anda sendiri!");
  if (amount > (currentUser.balance || 0)) return alert("Saldo Anda tidak mencukupi untuk melakukan transfer ini!");

  db.ref("users/" + targetUser).once("value", (snap) => {
    if (!snap.exists()) return alert(`Warga dengan username @${targetUser} tidak ditemukan di database!`);

    const targetData = snap.val();
    const recipientName = targetData.fullname || targetUser;

    db.ref("transactions").push({
      username: currentUser.username, targetUser: targetUser, type: `Transfer ke @${targetUser} (${recipientName})`,
      amount: amount, note: note || "-", status: "Pending",
      time: new Date().toLocaleDateString('id-ID') + " " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      rawDate: new Date().toISOString().split('T')[0]
    }, (err) => {
      if (!err) {
        alert(`Permintaan Transfer Rp ${amount.toLocaleString('id-ID')} ke @${targetUser} berhasil dikirim ke Admin untuk verifikasi!`);
        closeModal('modal-kirim'); targetUserInput.value = ""; amountInput.value = ""; if (noteInput) noteInput.value = "";
      } else alert("Gagal mengirim transaksi: " + err.message);
    });
  });
}

function submitPinjamSaldo() {
  const loanAmountEl = document.getElementById("loan-amount");
  const loanReasonEl = document.getElementById("loan-reason");
  if(!loanAmountEl || !loanReasonEl) return;

  const amount = parseInt(loanAmountEl.value);
  const reason = loanReasonEl.value.trim();
  if (!amount || amount <= 0 || !reason) return alert("Lengkapi nominal dan alasan pinjaman!");

  pushTransaction(`Pinjaman (${reason})`, amount);
  closeModal('modal-pinjam');
  loanAmountEl.value = ""; loanReasonEl.value = "";
}

function submitTarikSaldo() {
  const withdrawAmountEl = document.getElementById("withdraw-amount");
  if(!withdrawAmountEl) return;
  const amount = parseInt(withdrawAmountEl.value);
  if (!amount || amount <= 0) return alert("Masukkan nominal yang valid!");
  if (amount > (currentUser.balance || 0)) return alert("Saldo Anda tidak mencukupi!");

  pushTransaction("Tarik Saldo", amount);
  closeModal('modal-tarik');
  withdrawAmountEl.value = "";
}

function openModalSec(type) {
  currentSecType = type;
  document.getElementById("sec-modal-title").innerText = `Setor ${type}`;
  document.getElementById("sec-amount-input").value = "";
  openModal('modal-sec-trans');
}

function submitSecondaryTransaction() {
  const amtInput = document.getElementById("sec-amount-input");
  if(!amtInput) return;
  const amount = parseInt(amtInput.value);
  if(!amount || amount <= 0) return alert("Masukkan nominal yang valid!");

  pushTransaction(currentSecType, amount);
  closeModal('modal-sec-trans');
  amtInput.value = "";
}

function payArisanAuto() {
  if (currentUser.status === "banned" || currentUser.muted) return alert("Akun Anda dibatasi oleh Bendahara!");
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  db.ref("transactions").orderByChild("username").equalTo(currentUser.username).once("value", (snap) => {
    let alreadyPaidToday = false;
    if(snap.exists()) {
      snap.forEach(child => {
        let t = child.val();
        if(t.type === "Iuran Arisan" && t.rawDate === todayStr) {
          alreadyPaidToday = true;
        }
      });
    }

    if(alreadyPaidToday) {
      return alert("⚠️ Anda sudah membayar iuran arisan hari ini! Pembayaran arisan dibatasi maksimal 1x sehari.");
    }

    if ((currentUser.balance || 0) < 25000) {
      return alert("Saldo Anda tidak mencukupi untuk membayar Iuran Arisan (Rp 25.000)!");
    }

    let newBal = currentUser.balance - 25000;
    db.ref("users/" + currentUser.username).update({ balance: newBal });

    db.ref("transactions").push({
      username: currentUser.username, type: "Iuran Arisan", amount: 25000, status: "Disetujui",
      time: new Date().toLocaleDateString('id-ID') + " " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      rawDate: todayStr
    }, (err) => {
      if(!err) {
        alert("🎉 Pembayaran Iuran Arisan Rp 25.000 berhasil! Saldo Anda telah terpotong otomatis.");
      }
    });
  });
}

function pushTransaction(type, amount) {
  db.ref("transactions").push({
    username: currentUser.username, type: type, amount: amount, status: "Pending",
    time: new Date().toLocaleDateString('id-ID') + " " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
    rawDate: new Date().toISOString().split('T')[0]
  }, (err) => {
    if (!err) {
      alert(`Permintaan ${type} sebesar Rp ${amount.toLocaleString('id-ID')} berhasil dikirim ke Admin untuk diverifikasi!`);
      switchNav('beranda', document.querySelectorAll('.nav-btn')[0]);
    } else alert("Gagal mengajukan transaksi: " + err.message);
  });
}

function renderUserTransactions() {
  const listRecent = document.getElementById("list-recent-history");
  const listActivity = document.getElementById("list-activity-logs");
  if(!listRecent || !listActivity) return;

  listRecent.innerHTML = ""; listActivity.innerHTML = "";
  let countRecent = 0;

  globalTransactions.forEach((t) => {
    let color = t.status === 'Disetujui' ? '#4ade80' : (t.status === 'Ditolak' ? '#f87171' : '#f59e0b');
    let html = `
      <div class="list-item">
        <div>
          <div style="font-size: 13px; font-weight: 600;">${t.type}</div>
          <div style="font-size: 10px; color: #94a3b8;">📅 Waktu: ${t.time} ${t.note && t.note !== '-' ? '| 💬 ' + t.note : ''}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 700;">Rp ${t.amount.toLocaleString('id-ID')}</div>
          <div style="font-size: 10px; color: ${color}; font-weight: 600;">${t.status}</div>
        </div>
      </div>`;

    if (countRecent < 5) { listRecent.innerHTML += html; countRecent++; }
    listActivity.innerHTML += html;
  });

  if (globalTransactions.length === 0) {
    listRecent.innerHTML = `<div class="empty-state">Belum ada riwayat transaksi.</div>`;
    listActivity.innerHTML = `<div class="empty-state">Belum ada aktivitas baru.</div>`;
  }
}

function renderFilteredUserHistory() {
  const listAll = document.getElementById("list-all-history");
  const filterTypeEl = document.getElementById("filter-type");
  const startDateEl = document.getElementById("filter-start-date");
  const endDateEl = document.getElementById("filter-end-date");
  if(!listAll) return;

  const typeVal = filterTypeEl ? filterTypeEl.value : "ALL";
  const startVal = startDateEl ? startDateEl.value : "";
  const endVal = endDateEl ? endDateEl.value : "";

  listAll.innerHTML = "";
  let matchedCount = 0;

  globalTransactions.forEach(t => {
    let matchType = (typeVal === "ALL") || (t.type.toLowerCase().includes(typeVal.toLowerCase()));
    let matchDate = true;

    if (t.rawDate) {
      if (startVal && t.rawDate < startVal) matchDate = false;
      if (endVal && t.rawDate > endVal) matchDate = false;
    }

    if (matchType && matchDate) {
      matchedCount++;
      let color = t.status === 'Disetujui' ? '#4ade80' : (t.status === 'Ditolak' ? '#f87171' : '#f59e0b');
      listAll.innerHTML += `
        <div class="list-item">
          <div>
            <div style="font-size: 13px; font-weight: 600;">${t.type}</div>
            <div style="font-size: 10px; color: #94a3b8;">📅 Waktu: ${t.time}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 700;">Rp ${t.amount.toLocaleString('id-ID')}</div>
            <div style="font-size: 10px; color: ${color}; font-weight: 600;">${t.status}</div>
          </div>
        </div>`;
    }
  });

  if (matchedCount === 0) {
    listAll.innerHTML = `<div class="empty-state">Tidak ada riwayat transaksi yang sesuai filter.</div>`;
  }
}

function listenUserChat() {
  if (!db || !currentUser) return;
  db.ref("chats/" + currentUser.username).on("value", (snap) => {
    const box = document.getElementById("user-chat-box");
    if(!box) return;
    box.innerHTML = "";
    const chats = snap.val();
    if (chats) {
      Object.keys(chats).forEach(k => {
        const c = chats[k];
        box.innerHTML += `<div class="chat-bubble ${c.sender === 'user' ? 'chat-me' : 'chat-admin'}">${c.text}</div>`;
      });
      box.scrollTop = box.scrollHeight;
    } else {
      box.innerHTML = `<div class="empty-state">Belum ada obrolan. Ketik pesan di bawah untuk berkonsultasi dengan Bendahara!</div>`;
    }
  });
}

function sendChat() {
  const input = document.getElementById("chat-input");
  if (!input || !input.value.trim()) return;
  db.ref("chats/" + currentUser.username).push({
    sender: "user", text: input.value.trim(),
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
  input.value = "";
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
// 8. LOGIKA DASHBOARD ADMIN
// ==========================================
function initAdminDashboard() {
  const session = JSON.parse(localStorage.getItem("loggedUser") || sessionStorage.getItem("loggedUser"));
  if (!session || (session.username !== "RhyoTama" && session.role !== "admin")) {
    window.location.href = "loginadmin.html";
    return;
  }

  bindAdminEvents();

  if (db) {
    db.ref("users").on("value", (snap) => {
      globalUsers = snap.val() || {}; updateAdminUserOptions(); renderAdminAllData();
    });
    db.ref("transactions").on("value", (snap) => {
      globalTrxs = snap.val() || {}; renderAdminAllData();
    });
    db.ref("arisan_winner").on("value", (snap) => {
      const el = document.getElementById("view-rng-winner");
      if(el) el.innerText = snap.val() || "Belum Ada";
    });
  }
}

function bindAdminEvents() {
  const btnSidebarToggle = document.getElementById("btn-toggle-sidebar");
  if(btnSidebarToggle) btnSidebarToggle.addEventListener("click", () => {
    document.getElementById('sidebar').classList.toggle('show');
  });

  const menuMap = [
    { btn: 'menu-btn-verifikasi', tab: 'tab-verifikasi', title: '1. Verifikasi Transaksi' },
    { btn: 'menu-btn-riwayat', tab: 'tab-riwayat', title: '2. Riwayat Transaksi' },
    { btn: 'menu-btn-rekap', tab: 'tab-rekap', title: '3. Rekap Saldo Warga' },
    { btn: 'menu-btn-iuran', tab: 'tab-iuran', title: '4. Rekap Iuran & Zakat' },
    { btn: 'menu-btn-arisan', tab: 'tab-arisan', title: '5. Pengocok Arisan (RNG)' },
    { btn: 'menu-btn-chat', tab: 'tab-chat', title: '6. Layanan Live Chat' },
    { btn: 'menu-btn-moderasi', tab: 'tab-moderasi', title: '7. Moderasi Akun' },
    { btn: 'menu-btn-status', tab: 'tab-status', title: '8. Status Warga' },
    { btn: 'menu-btn-data-warga', tab: 'tab-data-warga', title: '9. Database Data Warga' }
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
  if(btnLogout) btnLogout.addEventListener("click", () => {
    localStorage.clear(); sessionStorage.clear(); window.location.href = "loginadmin.html";
  });

  const btnKocok = document.getElementById("btn-kocok-arisan");
  if(btnKocok) btnKocok.addEventListener("click", kocokArisan);

  const btnCleanArisan = document.getElementById("btn-clean-arisan");
  if(btnCleanArisan) btnCleanArisan.addEventListener("click", hapusPemenang);

  const btnAdminSendChat = document.getElementById("btn-admin-send-chat");
  if(btnAdminSendChat) btnAdminSendChat.addEventListener("click", sendAdminChat);
}

function updateAdminUserOptions() {
  const filterSel = document.getElementById("filter-user-history");
  const chatSel = document.getElementById("chat-user-selector");
  if(!filterSel || !chatSel) return;

  const currentFilter = filterSel.value;
  const currentChat = chatSel.value;

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
  if (currentFilter) filterSel.value = currentFilter;
  if (currentChat) chatSel.value = currentChat;
}

function renderAdminAllData() {
  let totalKasTabungan = 0, totalKasArisan = 0, countPending = 0;
  const filterSel = document.getElementById("filter-user-history");
  const selectedUserFilter = filterSel ? filterSel.value : "ALL";
  
  const tbVerif = document.getElementById("tb-verifikasi"); if(tbVerif) tbVerif.innerHTML = "";
  const tbRiwayat = document.getElementById("tb-riwayat-all"); if(tbRiwayat) tbRiwayat.innerHTML = "";
  const tbIuran = document.getElementById("tb-rekap-iuran"); if(tbIuran) tbIuran.innerHTML = "";

  let countRiwayatRendered = 0;

  Object.keys(globalTrxs).reverse().forEach(key => {
    const trx = globalTrxs[key];
    
    // PERBAIKAN UTAMA: Hitung masuk (Iuran Arisan) dan kurangi dengan keluar (Pencairan Kas Arisan)
    if (trx.status === 'Disetujui') {
      if (trx.type === 'Iuran Arisan') {
        totalKasArisan += trx.amount;
      } else if (trx.type === 'Pencairan Kas Arisan') {
        totalKasArisan += trx.amount; // Karena amount bernilai negatif (-), ini otomatis mengurangi total kas arisan
      }
    }

    if (trx.status === 'Pending') {
      countPending++;
      if(tbVerif) {
        tbVerif.innerHTML += `
          <tr>
            <td style="color:#94a3b8; font-size:11px;">${trx.time}</td>
            <td><b>@${trx.username}</b></td>
            <td><b style="color:${trx.type === 'Iuran Arisan' ? '#f59e0b' : '#38bdf8'}">${trx.type}</b></td>
            <td><b>Rp ${(trx.amount || 0).toLocaleString('id-ID')}</b></td>
            <td><span class="badge badge-pending">${trx.status}</span></td>
            <td>
              <button class="btn-action btn-acc" onclick="accTrx('${key}')"><i class="fa-solid fa-check"></i> ACC</button> 
              <button class="btn-action btn-reject" onclick="rejTrx('${key}')"><i class="fa-solid fa-xmark"></i> Tolak</button>
            </td>
          </tr>`;
      }
    } else {
      if (selectedUserFilter === "ALL" || selectedUserFilter === trx.username) {
        countRiwayatRendered++;
        let badgeClass = trx.status === 'Disetujui' ? 'badge-success' : 'badge-danger';
        if(tbRiwayat) {
          tbRiwayat.innerHTML += `
            <tr>
              <td style="color:#94a3b8; font-size:11px;">${trx.time}</td>
              <td><b>@${trx.username}</b></td>
              <td><b>${trx.type}</b></td>
              <td><b>Rp ${(trx.amount || 0).toLocaleString('id-ID')}</b></td>
              <td><span class="badge ${badgeClass}">${trx.status}</span></td>
              <td>
                <button class="btn-action btn-del" onclick="deleteTrx('${key}')"><i class="fa-solid fa-trash"></i> Hapus</button>
              </td>
            </tr>`;
        }
      }
    }

    if (tbIuran && (trx.type.includes("Iuran") || trx.type.includes("Sumbangan") || trx.type.includes("Zakat"))) {
      tbIuran.innerHTML += `
        <tr>
          <td>${trx.time}</td>
          <td><b>@${trx.username}</b></td>
          <td>${trx.type}</td>
          <td>Rp ${(trx.amount || 0).toLocaleString('id-ID')}</td>
          <td><span class="badge ${trx.status==='Disetujui'?'badge-success':'badge-pending'}">${trx.status}</span></td>
        </tr>`;
    }
  });

  if (tbVerif && countPending === 0) tbVerif.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Tidak ada transaksi pending.</td></tr>`;
  if (tbRiwayat && countRiwayatRendered === 0) tbRiwayat.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Belum ada riwayat transaksi.</td></tr>`;

  const tbSaldo = document.getElementById("tb-saldo"); if(tbSaldo) tbSaldo.innerHTML = "";
  const tbMod = document.getElementById("tb-mod"); if(tbMod) tbMod.innerHTML = "";
  const tbStatus = document.getElementById("tb-status-warga"); if(tbStatus) tbStatus.innerHTML = "";
  const tbDataWarga = document.getElementById("tb-datawarga"); if(tbDataWarga) tbDataWarga.innerHTML = "";

  Object.keys(globalUsers).forEach(username => {
    const u = globalUsers[username];
    if (u.role !== 'admin') {
      totalKasTabungan += (u.balance || 0);

      if (tbSaldo) {
        tbSaldo.innerHTML += `
          <tr>
            <td><div><b>${u.fullname || username}</b></div><div style="font-size:11px; color:#94a3b8;">@${username}</div></td>
            <td style="color:#10b981; font-weight:bold;">Rp ${(u.balance||0).toLocaleString('id-ID')}</td>
            <td>
              <button class="btn-action btn-acc" onclick="editSaldo('${username}')"><i class="fa-solid fa-pen-to-square"></i> Edit Saldo</button>
              ${u.warning ? `<button class="btn-action btn-del" onclick="hapusTeguran('${username}')">Hapus Teguran</button>` : `<button class="btn-action btn-warn" onclick="tegurWarga('${username}')">Tegur</button>`}
            </td>
          </tr>`;
      }

      if (tbMod) {
        tbMod.innerHTML += `
          <tr>
            <td><b>@${username}</b></td>
            <td><span class="badge ${u.status==='banned'?'badge-pending':'badge-success'}">${u.status || 'active'}</span></td>
            <td style="font-size:11px; color:#fca5a5;">${u.warning || '-'}</td>
            <td>
              <button class="btn-action ${u.status==='active'?'btn-reject':'btn-acc'}" onclick="toggleBan('${username}', '${u.status==='active'?'banned':'active'}')">${u.status==='active'?'Ban':'Unban'}</button>
              <button class="btn-action btn-del" onclick="hapusUser('${username}')">Hapus</button>
            </td>
          </tr>`;
      }

      if (tbStatus) {
        let isOnlineReal = u.isOnline === true;
        tbStatus.innerHTML += `
          <tr>
            <td><b>${u.fullname || username}</b></td>
            <td>@${username}</td>
            <td>${u.lastLogin || '-'}</td>
            <td><span class="badge ${isOnlineReal ? 'badge-success' : 'badge-danger'}">${isOnlineReal ? 'Aktif (Online)' : 'Offline / Nonaktif'}</span></td>
          </tr>`;
      }

      if (tbDataWarga) {
        tbDataWarga.innerHTML += `
          <tr>
            <td><b>${u.fullname || username}</b></td>
            <td><span style="color:#38bdf8;">@${username}</span></td>
            <td>${u.email || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td>${u.birthPlace || '-'}</td>
            <td><b style="color:#10b981;">${u.bank || '-'}</b></td>
            <td><b>${u.accountName || '-'}</b></td>
            <td><span style="font-family:monospace; color:#fff;">${u.accountNumber || '-'}</span></td>
            <td>${u.birthDate || '-'}</td>
            <td>${u.motherName || '-'}</td>
            <td><span style="font-family:monospace; color:#f59e0b;">${u.pin || '------'}</span></td>
            <td><span style="font-family:monospace; color:#ff3b5c;">${u.password || '******'}</span></td>
          </tr>`;
      }
    }
  });

  const mKasTab = document.getElementById("m-kas-tabungan"); if(mKasTab) mKasTab.innerText = "Rp " + totalKasTabungan.toLocaleString('id-ID');
  const mKasAri = document.getElementById("m-kas-arisan"); if(mKasAri) mKasAri.innerText = "Rp " + totalKasArisan.toLocaleString('id-ID');
  const mPend = document.getElementById("m-pending"); if(mPend) mPend.innerText = countPending;

  loadAdminChat();
}

function accTrx(trxKey) {
  const trx = globalTrxs[trxKey];
  if (!trx) return;

  const senderUser = globalUsers[trx.username] || {};
  let senderBal = senderUser.balance || 0;

  if (trx.type === "Nabung") {
    senderBal += trx.amount;
    let updates = { balance: senderBal };
    if (trx.amount >= 50000 && senderUser.status !== "active") {
      updates.status = "active";
    }
    db.ref("users/" + trx.username).update(updates);
  } else if (trx.type.includes("Tarik")) {
    if (senderBal < trx.amount) return alert("Gagal ACC: Saldo warga pengirim tidak mencukupi!");
    senderBal -= trx.amount;
    db.ref("users/" + trx.username).update({ balance: senderBal });
  } else if (trx.type.includes("Transfer ke") || trx.type.includes("Kirim Saldo")) {
    if (senderBal < trx.amount) return alert("Gagal ACC: Saldo pengirim tidak cukup!");

    const targetUsername = trx.targetUser;
    const recipientUser = globalUsers[targetUsername];
    if (!recipientUser) return alert("Gagal ACC: Username penerima tidak ditemukan!");

    senderBal -= trx.amount;
    db.ref("users/" + trx.username).update({ balance: senderBal });

    let recipientBal = (recipientUser.balance || 0) + trx.amount;
    db.ref("users/" + targetUsername).update({ balance: recipientBal });

    const timeStr = new Date().toLocaleDateString('id-ID') + " " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    db.ref("transactions").push({
      username: targetUsername, type: `Terima Transfer dari @${trx.username}`, amount: trx.amount,
      note: trx.note || "-", status: "Disetujui", time: timeStr, rawDate: new Date().toISOString().split('T')[0]
    });
  }

  db.ref("transactions/" + trxKey).update({ status: "Disetujui" }, (err) => {
    if (!err) alert("🎉 Transaksi Berhasil Di-ACC! Saldo & Riwayat Otomatis Terupdate.");
  });
}

function rejTrx(trxKey) { db.ref("transactions/" + trxKey).update({ status: "Ditolak" }); }
function deleteTrx(trxKey) { if (confirm("Hapus transaksi dari riwayat cloud?")) db.ref("transactions/" + trxKey).remove(); }

function editSaldo(username) {
  const currentBal = globalUsers[username] ? (globalUsers[username].balance || 0) : 0;
  const newBal = prompt(`Edit Saldo @${username} (Rp):`, currentBal);
  if (newBal !== null) db.ref("users/" + username).update({ balance: parseInt(newBal) || 0 });
}

function tegurWarga(username) {
  const msg = prompt(`Kirim teguran ke @${username}:`, "Silakan lakukan verifikasi setor tabungan ke Bendahara.");
  if (msg) db.ref("users/" + username).update({ warning: msg });
}

function hapusTeguran(username) {
  if (confirm(`Hapus teguran untuk @${username}?`)) db.ref("users/" + username + "/warning").remove();
}

function kocokArisan() {
  const publics = Object.keys(globalUsers).filter(u => globalUsers[u].role !== 'admin');
  if (publics.length === 0) return alert("Belum ada warga terdaftar!");

  let totalKasArisan = 0;
  Object.keys(globalTrxs).forEach(k => {
    let t = globalTrxs[k]; 
    if (t.status === 'Disetujui') {
      if (t.type === 'Iuran Arisan') totalKasArisan += t.amount;
      if (t.type === 'Pencairan Kas Arisan') totalKasArisan += t.amount;
    }
  });

  if (totalKasArisan <= 0) return alert("Kas Arisan kosong, tidak ada dana untuk dikocok!");

  let randKey = publics[Math.floor(Math.random() * publics.length)];
  let winner = globalUsers[randKey];
  let winName = winner.fullname || winner.username;

  if (confirm(`🎉 PEMENANG ARISAN:\n${winName} (@${winner.username})\n\nTransfer Rp ${totalKasArisan.toLocaleString('id-ID')} ke akunnya?`)) {
    let newBal = (winner.balance || 0) + totalKasArisan;
    db.ref("users/" + winner.username).update({ balance: newBal });

    const timeStr = new Date().toLocaleDateString('id-ID') + " " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    db.ref("transactions").push({ username: winner.username, type: "Pemenang Arisan", amount: totalKasArisan, status: "Disetujui", time: timeStr, rawDate: new Date().toISOString().split('T')[0] });
    
    // Catat pengeluaran kas arisan bernilai negatif agar total kas arisan berkurang secara akurat
    db.ref("transactions").push({ username: "SYSTEM", type: "Pencairan Kas Arisan", amount: -totalKasArisan, status: "Disetujui", time: timeStr, rawDate: new Date().toISOString().split('T')[0] });

    db.ref("arisan_winner").set(`${winName} — Rp ${totalKasArisan.toLocaleString('id-ID')}`);
    alert(`BERHASIL! Saldo kas arisan telah dipotong dan dikirim ke @${winner.username}! Banner diterbitkan.`);
  }
}

function hapusPemenang() { if (confirm("Bersihkan banner pemenang arisan?")) db.ref("arisan_winner").set(""); }

function loadAdminChat() {
  const sel = document.getElementById("chat-user-selector");
  if (!sel) return;
  const target = sel.value;
  if (!target) return;

  db.ref("chats/" + target).once("value", (snap) => {
    const box = document.getElementById("admin-chat-box");
    if(!box) return; box.innerHTML = "";
    const chats = snap.val();
    if (chats) {
      Object.keys(chats).forEach(k => {
        const c = chats[k];
        box.innerHTML += `<div style="margin-bottom:8px; padding:8px 12px; border-radius:12px; font-size:12px; max-width:85%; ${c.sender==='admin'?'background:#ff3b5c; color:#fff; margin-left:auto;':'background:rgba(255,255,255,0.1); color:#fff;'}">${c.text}</div>`;
      });
      box.scrollTop = box.scrollHeight;
    }
  });
}

function sendAdminChat() {
  const target = document.getElementById("chat-user-selector").value;
  const input = document.getElementById("admin-chat-input");
  if (!input || !input.value.trim() || !target) return;

  db.ref("chats/" + target).push({
    sender: "admin", text: input.value.trim(),
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
  input.value = ""; loadAdminChat();
}

function hapusUser(username) {
  if (confirm(`HAPUS AKUN @${username} permanen dari cloud database?`)) {
    db.ref("users/" + username).remove(); db.ref("chats/" + username).remove();
  }
}

function toggleBan(username, newStatus) { db.ref("users/" + username).update({ status: newStatus }); }

// ==========================================
// 9. AUTO POP-UP NOTIFIKASI PENCAIRAN SALDO
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
  setTimeout(() => { toastEl.classList.add("hidden"); }, 5000);
}

function startWithdrawalToastLoop() {
  setTimeout(() => {
    triggerWithdrawalToast();
    setInterval(triggerWithdrawalToast, 15000);
  }, 2000);
}
