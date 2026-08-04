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

    if (typeof initRealtimePasswordCheck === 'function') {
      initRealtimePasswordCheck("reg-password", "reg-confirm-password", "pass-match-status", "rule-");
      initRealtimePasswordCheck("forget-new-pass", "forget-conf-pass", "pass-match-status", "rule-");
    }
    
    if (typeof initUsernameAutoSuggest === 'function') initUsernameAutoSuggest();
    if (typeof initLoginUserHandler === 'function') initLoginUserHandler();
    if (typeof initRegisterUserHandler === 'function') initRegisterUserHandler();
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
// 3. LOGIKA VALIDASI SANDI DINAMIS & COCOK
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
          el.style.color = valid ? "#4ade80" : "#f87171";
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
      matchStatus.style.color = "#4ade80"; 
      matchStatus.innerText = "✔ Sandi Cocok";
    } else if (confInput.value.length > 0) {
      matchStatus.style.color = "#f87171"; 
      matchStatus.innerText = "✖ Sandi Tidak Cocok";
    } else { 
      matchStatus.innerText = ""; 
    }
  }

  if (confInput) confInput.addEventListener("input", checkMatch);
}

// ==========================================
// 4. AUTH & NAVIGASI USER (LOGIN, DAFTAR, LUPA PASSWORD)
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
            statusEl.style.color = "#f87171";
            statusEl.innerText = `⚠️ Username terpakai. Diganti ke @${newUsername}`;
          }
        } else {
          if (statusEl) {
            statusEl.className = "username-status valid";
            statusEl.style.color = "#4ade80";
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
      const bank = document.getElementById("reg-bank").value;
      const accName = document.getElementById("reg-acc-name").value.trim();
      const accNum = document.getElementById("reg-acc-number").value.trim();

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
      if (!passVal.isValid) return alert("Sandi harus minimal 8 karakter dengan kombinasi Huruf Kapital, Huruf Kecil, Angka, dan Simbol (!?;:*&$,@)!");
      if (password !== confirmPassword) return alert("Konfirmasi sandi tidak cocok!");

      db.ref("users/" + username).once("value", (snap) => {
        if (snap.exists()) {
          alert("Username sudah terdaftar!");
        } else {
          const newUserObject = {
            fullname: fullname, username: username, email: email, phone: phone, birthPlace: pob,
            bank: bank, accountName: accName, accountNumber: accNum, birthDate: dob, motherName: mother,
            password: password, role: "user", balance: 100000, status: "pending_verification",
            isOnline: false, muted: false, warning: "", lastLogin: "-", createdAt: new Date().toLocaleString("id-ID")
          };

          db.ref("users/" + username).set(newUserObject, (err) => {
            if (err) {
              alert("Gagal Mendaftar: " + err.message);
            } else {
              alert("🎉 Pendaftaran Berhasil! Bonus saldo Rp 100.000 telah masuk (terkunci). Lakukan setoran awal min. Rp 50.000 di menu Isi Saldo agar akun aktif dan semua fitur terbuka.");
              formDaftar.reset();
              switchForm('login');
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
  
  if (!valRes.isValid) return alert("Sandi baru harus minimal 8 karakter dengan kombinasi Huruf Kapital, Huruf Kecil, Angka, dan Simbol (!?;:*&$,@)!");
  if (newPass !== confPass) return alert("Konfirmasi sandi baru tidak cocok!");

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
// 6. LOGIN ADMIN (DIJAMIN MASUK)
// ==========================================
function handleAdminLogin(e) {
  if (e) e.preventDefault();

  const uEl = document.getElementById("admin-username");
  const pEl = document.getElementById("admin-password");
  if (!uEl || !pEl) return alert("Input login admin tidak ditemukan!");

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
      if (snap.exists()) {
        const uVal = snap.val();
        if (uVal.password === p && uVal.role === "admin") {
          localStorage.setItem("loggedUser", JSON.stringify(uVal));
          db.ref("users/" + u).update({ isOnline: true });
          alert("🔓 Otentikasi Berhasil!");
          window.location.href = "admin.html";
        } else {
          alert("Akses Ditolak: Password admin salah atau akun bukan admin!");
        }
      } else {
        alert("Akses Ditolak: Username Admin tidak terdaftar!");
      }
    });
  } else {
    alert("Koneksi database tidak tersedia!");
  }

  return false;
}

// ==========================================
// 7. KUNCI AKSES & DASHBOARD USER
// ==========================================
function checkAccess() {
  if (!currentUser) return false;
  if (currentUser.status === "banned") {
    alert("🚨 Akses Ditolak: Akun Anda telah diblokir oleh Bendahara.");
    return false;
  }
  if (currentUser.status !== "active") {
    alert("⚠️ Akun Anda masih terkunci! Selesaikan setoran awal minimal Rp 50.000 melalui menu 'Isi Saldo' dan tunggu konfirmasi ACC dari Bendahara agar semua fitur terbuka.");
    return false;
  }
  return true;
}

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
      document.getElementById("log-last-login").innerText = currentUser.lastLogin || "Baru Saja";
      document.getElementById("log-status-akun").innerText = currentUser.status === "active" ? "Aktif (Terverifikasi)" : "Menunggu Setoran Awal (Min. Rp 50.000)";
      
      const warnBox = document.getElementById("box-warning");
      if (currentUser.warning) {
        document.getElementById("text-warning").innerText = currentUser.warning;
        warnBox.classList.remove("hidden");
      } else {
        warnBox.classList.add("hidden");
      }
    }
  });

  bindUserEvents();

  // Listener transaksi umum admin
  db.ref("transactions").on("value", (snap) => {
    const trxs = snap.val();
    globalTransactions = [];
    if (trxs) {
      Object.keys(trxs).reverse().forEach(key => {
        const t = trxs[key];
        if (t.username === currentUser.username || t.targetUser === currentUser.username || t.requester === currentUser.username) {
          globalTransactions.push({ id: key, ...t });
        }
      });
    }
    fetchP2PRequests(); 
  });

  listenUserChat();
  loadFriendsList();
  populateAvailableUsersForFriend();
  populateAvailableUsersForMinta();
}

// Mengambil data P2P murni secara terpisah dari node `p2p_requests`
function fetchP2PRequests() {
  db.ref("p2p_requests").on("value", (snap) => {
    const p2ps = snap.val();
    if (p2ps) {
      Object.keys(p2ps).reverse().forEach(key => {
        const t = p2ps[key];
        if (t.requester === currentUser.username || t.targetUser === currentUser.username) {
          const exists = globalTransactions.some(item => item.id === key);
          if (!exists) {
            globalTransactions.unshift({
              id: key,
              type: `Permintaan Saldo dari @${t.requester}`,
              username: t.requester,
              targetUser: t.targetUser,
              amount: t.amount,
              status: t.status,
              time: t.time,
              rawDate: t.rawDate,
              isP2P: true
            });
          } else {
            const idx = globalTransactions.findIndex(item => item.id === key);
            if (idx !== -1) {
              globalTransactions[idx].status = t.status;
            }
          }
        }
      });
    }
    renderUserTransactions();
    renderFilteredUserHistory();
    renderActivityLogs();
  });
}

function bindUserEvents() {
  document.getElementById("btn-eye-balance").addEventListener("click", toggleBalanceHide);
  document.getElementById("btn-open-profile").addEventListener("click", () => {
    document.getElementById("edit-fullname").value = currentUser.fullname || "";
    document.getElementById("edit-username").value = currentUser.username || "";
    document.getElementById("edit-phone").value = currentUser.phone || "";
    document.getElementById("edit-bank").value = currentUser.bank || "";
    document.getElementById("edit-acc-name").value = currentUser.accountName || "";
    document.getElementById("edit-acc-num").value = currentUser.accountNumber || "";
    openModal('modal-profil');
  });

  document.querySelectorAll(".btn-close-modal").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.getAttribute("data-modal")));
  });

  document.getElementById("nav-btn-beranda").addEventListener("click", function() { switchNav('beranda', this); });
  document.getElementById("nav-btn-aktivitas").addEventListener("click", function() { switchNav('aktivitas', this); });
  document.getElementById("nav-btn-isisaldo").addEventListener("click", function() { switchNav('isisaldo', document.getElementById('nav-dummy')); });
  document.getElementById("nav-btn-chat").addEventListener("click", function() { switchNav('chat', this); });
  document.getElementById("nav-btn-settings").addEventListener("click", () => openModal('modal-app-settings'));

  document.getElementById("btn-sec-all-history").addEventListener("click", () => {
    switchNav('history', document.getElementById('nav-btn-beranda'));
  });

  document.getElementById("btn-act-kirim").addEventListener("click", () => { if (checkAccess()) openModal('modal-kirim'); });
  document.getElementById("btn-act-minta").addEventListener("click", () => { if (checkAccess()) openModal('modal-minta'); });
  document.getElementById("btn-act-pinjam").addEventListener("click", () => { if (checkAccess()) openModal('modal-pinjam'); });
  document.getElementById("btn-sec-tarik").addEventListener("click", () => { if (checkAccess()) openModal('modal-tarik'); });
  document.getElementById("btn-sec-rekap").addEventListener("click", () => { if (checkAccess()) { showMonthlySummary(); openModal('modal-rekap'); } });
  document.getElementById("btn-sec-pertemanan").addEventListener("click", () => { if (checkAccess()) { loadFriendRequests(); loadFriendsList(); openModal('modal-pertemanan'); } });

  document.getElementById("btn-submit-topup").addEventListener("click", submitTopupQRIS);
  document.getElementById("btn-submit-kirim").addEventListener("click", submitKirimSaldo);
  document.getElementById("btn-submit-minta").addEventListener("click", submitMintaSaldo);
  document.getElementById("btn-submit-pinjam").addEventListener("click", submitPinjamSaldo);
  document.getElementById("btn-submit-tarik").addEventListener("click", submitTarikSaldo);
  document.getElementById("btn-send-friend-req").addEventListener("click", sendFriendRequest);
  document.getElementById("btn-send-chat").addEventListener("click", sendChat);
  document.getElementById("btn-send-friend-chat").addEventListener("click", sendFriendChat);
  document.getElementById("btn-theme-toggle").addEventListener("click", toggleThemeMode);
  document.getElementById("btn-app-logout").addEventListener("click", logoutUser);

  const friendChatCard = document.querySelector("#friend-chat-box")?.parentElement;
  if (friendChatCard && !document.getElementById("friend-chat-input-area")) {
    const inputArea = document.createElement("div");
    inputArea.id = "friend-chat-input-area";
    inputArea.style.cssText = "display: none; gap: 8px; margin-top: 10px;";
    inputArea.innerHTML = `
      <input type="text" id="friend-chat-input" placeholder="Ketik pesan ke teman..." class="form-control" style="flex: 1;">
      <button id="btn-send-friend-chat" class="btn-action btn-acc" style="padding: 0 16px;">Kirim</button>
    `;
    friendChatCard.appendChild(inputArea);

    const btnSendFriendChat = document.getElementById("btn-send-friend-chat");
    if(btnSendFriendChat) btnSendFriendChat.addEventListener("click", sendFriendChat);
  }

  const friendSelector = document.getElementById("friend-chat-selector");
  if(friendSelector) {
    friendSelector.addEventListener("change", function() {
      const friendName = this.value;
      const inputArea = document.getElementById("friend-chat-input-area");
      if(friendName) {
        if(inputArea) inputArea.style.display = "flex";
        listenFriendChat(friendName);
      } else {
        if(inputArea) inputArea.style.display = "none";
        document.getElementById("friend-chat-box").innerHTML = `<div class="empty-state">Pilih teman di atas untuk mulai mengobrol.</div>`;
      }
    });
  }

  document.getElementById("filter-type").addEventListener("change", renderFilteredUserHistory);
  document.getElementById("filter-start-date").addEventListener("change", renderFilteredUserHistory);
  document.getElementById("filter-end-date").addEventListener("change", renderFilteredUserHistory);
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
  if (targetUser === currentUser.username.toLowerCase()) return alert("Tidak bisa kirim ke diri sendiri!");
  if (amount > currentUser.balance) return alert("Saldo tidak mencukupi!");

  db.ref("users/" + targetUser).once("value", (snap) => {
    if (!snap.exists()) return alert(`Username @${targetUser} tidak ditemukan!`);

    db.ref("transactions").push({
      username: currentUser.username,
      targetUser: targetUser,
      type: `Transfer ke @${targetUser}`,
      amount: amount,
      note: note,
      status: "Pending",
      time: new Date().toLocaleString('id-ID'),
      rawDate: new Date().toISOString().split('T')[0]
    }, (err) => {
      if (!err) {
        alert("Permintaan Kirim Saldo dikirim ke Admin untuk verifikasi.");
        closeModal('modal-kirim');
        document.getElementById("send-target-user").value = "";
        document.getElementById("send-amount").value = "";
      }
    });
  });
}

// ==========================================
// FITUR P2P: MINTA SALDO ANTARWARGA (MURNI TANPA ADMIN)
// ==========================================
function populateAvailableUsersForMinta() {
  const selectEl = document.getElementById("minta-target-user");
  if (!selectEl) return;
  db.ref("users").once("value", (snap) => {
    const users = snap.val() || {};
    let html = `<option value="">-- Pilih Warga Tujuan --</option>`;
    Object.keys(users).forEach(uKey => {
      let u = users[uKey];
      if (u.role !== 'admin' && uKey !== currentUser.username) {
        html += `<option value="${uKey}">@${uKey} (${u.fullname || uKey})</option>`;
      }
    });
    selectEl.innerHTML = html;
  });
}

// Murni disimpan ke `p2p_requests` (DIJAMIN TIDAK MASUK KE ADMIN SAMA SEKALI)
function submitMintaSaldo() {
  const targetUser = document.getElementById("minta-target-user").value.trim().toLowerCase().replace("@", "");
  const amount = parseInt(document.getElementById("minta-amount").value);

  if (!targetUser || !amount || amount <= 0) return alert("Lengkapi data permintaan saldo!");
  if (targetUser === currentUser.username.toLowerCase()) return alert("Tidak bisa meminta saldo ke diri sendiri!");

  db.ref("users/" + targetUser).once("value", (snap) => {
    if (!snap.exists()) return alert("Username warga tujuan tidak ditemukan!");

    // Pastikan mutlak mengarah ke p2p_requests
    db.ref("p2p_requests").push({
      requester: currentUser.username, 
      targetUser: targetUser,         
      amount: amount,
      status: "Pending",
      time: new Date().toLocaleString('id-ID'),
      rawDate: new Date().toISOString().split('T')[0]
    }, (err) => {
      if (!err) {
        alert(`Permintaan saldo sebesar Rp ${amount.toLocaleString('id-ID')} berhasil dikirim ke @${targetUser}. Menunggu persetujuan dari yang bersangkutan.`);
        closeModal('modal-minta');
        document.getElementById("minta-amount").value = "";
        document.getElementById("minta-target-user").value = "";
      }
    });
  });
}



function acceptP2PRequest(trxKey) {
  const trx = globalTransactions.find(t => t.id === trxKey);
  if (!trx) return alert("Data transaksi tidak ditemukan!");

  const requester = trx.username; // Warga A yang minta
  const targetUser = currentUser.username; // Warga B yang di-request & ACC
  const amt = Number(trx.amount) || 0;

  db.ref("users/" + targetUser).once("value", (bSnap) => {
    if (!bSnap.exists()) return alert("Data akun Anda tidak ditemukan!");
    let bBal = Number(bSnap.val().balance) || 0;

    if (bBal < amt) {
      return alert(`Gagal ACC: Saldo Anda saat ini (Rp ${bBal.toLocaleString('id-ID')}) tidak mencukupi untuk memenuhi permintaan sebesar Rp ${amt.toLocaleString('id-ID')}!`);
    }

    db.ref("users/" + requester).once("value", (aSnap) => {
      if (!aSnap.exists()) return alert("Akun warga peminta tidak ditemukan!");
      let aBal = Number(aSnap.val().balance) || 0;

      let updates = {};
      updates[`users/${targetUser}/balance`] = bBal - amt; // Saldo warga B berkurang otomatis
      updates[`users/${requester}/balance`] = aBal + amt;   // Saldo warga A bertambah otomatis
      updates[`p2p_requests/${trxKey}/status`] = "Disetujui";

      db.ref().update(updates, (err) => {
        if (!err) {
          alert(`🎉 Berhasil! Permintaan dari @${requester} disetujui. Saldo Anda berkurang Rp ${amt.toLocaleString('id-ID')} dan saldo @${requester} bertambah.`);
        } else {
          alert("Gagal memproses transaksi: " + err.message);
        }
      });
    });
  });
}

function rejectP2PRequest(trxKey) {
  // Jika ditolak, saldo kedua belah pihak TIDAK BERUBAH SAMA SEKALI
  db.ref(`p2p_requests/${trxKey}/status`).set("Ditolak", (err) => {
    if (!err) {
      alert("Permintaan saldo telah ditolak. Saldo Anda tidak berkurang dan saldo peminta tidak bertambah.");
    }
  });
}
// ==========================================

function submitPinjamSaldo() {
  const amount = parseInt(document.getElementById("loan-amount").value);
  const reason = document.getElementById("loan-reason").value.trim();
  if (!amount || !reason) return alert("Lengkapi data pinjaman!");
  pushTransaction(`Pinjaman (${reason})`, amount, currentUser.username, "ADMIN", "Pending");
  closeModal('modal-pinjam');
  document.getElementById("loan-amount").value = "";
  document.getElementById("loan-reason").value = "";
}

function submitTarikSaldo() {
  const amount = parseInt(document.getElementById("withdraw-amount").value);
  if (!amount || amount <= 0) return alert("Masukkan nominal!");
  if (amount > currentUser.balance) return alert("Saldo tidak cukup!");
  pushTransaction("Tarik Saldo", amount, currentUser.username, "ADMIN", "Pending");
  closeModal('modal-tarik');
  document.getElementById("withdraw-amount").value = "";
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

// Render Riwayat & Tombol ACC/Tolak Murni P2P di Akun Warga B
function renderUserTransactions() {
  const listRecent = document.getElementById("list-recent-history");
  if(!listRecent) return;
  listRecent.innerHTML = "";
  let count = 0;

  globalTransactions.forEach((t) => {
    let color = t.status === 'Disetujui' ? '#4ade80' : (t.status === 'Ditolak' ? '#f87171' : '#f59e0b');
    let resiBtn = t.status === 'Disetujui' ? `<button class="btn-action btn-acc" style="margin-top:4px; font-size:9px; padding:2px 6px;" onclick="showReceipt('${t.id}')">📄 Lihat Resi</button>` : '';
    
    // TOMBOL ACC/TOLAK MUNCUL DI AKUN WARGA YANG DIMINTAI SALDO (targetUser) SAAT STATUS PENDING
    let p2pActionHtml = '';
    if (t.status === 'Pending' && t.targetUser === currentUser.username && t.isP2P) {
      p2pActionHtml = `
        <div style="margin-top: 6px; display: flex; gap: 4px;">
          <button class="btn-action btn-acc" style="font-size:9px; padding:2px 6px;" onclick="acceptP2PRequest('${t.id}')">ACC</button>
          <button class="btn-action btn-reject" style="font-size:9px; padding:2px 6px;" onclick="rejectP2PRequest('${t.id}')">Tolak</button>
        </div>
      `;
    }

    let html = `
      <div class="list-item">
        <div>
          <div style="font-size: 13px; font-weight: 600;">${t.type}</div>
          <div style="font-size: 10px; color: #94a3b8;">📅 ${t.time}</div>
          ${resiBtn}
          ${p2pActionHtml}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 700;">Rp ${Number(t.amount).toLocaleString('id-ID')}</div>
          <div style="font-size: 10px; color: ${color}; font-weight: 600;">${t.status}</div>
        </div>
      </div>`;
    if (count < 5) { listRecent.innerHTML += html; count++; }
  });

  if (globalTransactions.length === 0) {
    listRecent.innerHTML = `<div class="empty-state">Belum ada riwayat transaksi.</div>`;
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
      let resiBtn = t.status === 'Disetujui' ? `<button class="btn-action btn-acc" style="margin-top:4px; font-size:9px; padding:2px 6px;" onclick="showReceipt('${t.id}')">📄 Lihat Resi</button>` : '';
      
      let p2pActionHtml = '';
      if (t.status === 'Pending' && t.targetUser === currentUser.username && t.isP2P) {
        p2pActionHtml = `
          <div style="margin-top: 6px; display: flex; gap: 4px;">
            <button class="btn-action btn-acc" style="font-size:9px; padding:2px 6px;" onclick="acceptP2PRequest('${t.id}')">ACC</button>
            <button class="btn-action btn-reject" style="font-size:9px; padding:2px 6px;" onclick="rejectP2PRequest('${t.id}')">Tolak</button>
          </div>
        `;
      }

      listAll.innerHTML += `
        <div class="list-item">
          <div>
            <div style="font-size: 13px; font-weight: 600;">${t.type}</div>
            <div style="font-size: 10px; color: #94a3b8;">📅 ${t.time}</div>
            ${resiBtn}
            ${p2pActionHtml}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 700;">Rp ${Number(t.amount).toLocaleString('id-ID')}</div>
            <div style="font-size: 10px; color: ${color}; font-weight: 600;">${t.status}</div>
          </div>
        </div>`;
    }
  });

  if (matchedCount === 0) {
    listAll.innerHTML = `<div class="empty-state">Tidak ada transaksi yang sesuai filter.</div>`;
  }
}

function renderActivityLogs() {
  const actLogs = document.getElementById("list-activity-logs");
  if (!actLogs) return;
  actLogs.innerHTML = "";
  let count = 0;

  globalTransactions.forEach(t => {
    let color = t.status === 'Disetujui' ? '#4ade80' : '#f59e0b';
    actLogs.innerHTML += `
      <div class="list-item">
        <div>
          <div style="font-size: 13px; font-weight: 600;">${t.type}</div>
          <div style="font-size: 10px; color: #94a3b8;">📅 ${t.time}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 700;">Rp ${Number(t.amount).toLocaleString('id-ID')}</div>
          <div style="font-size: 10px; color: ${color};">${t.status}</div>
        </div>
      </div>`;
    count++;
  });

  if (count === 0) {
    actLogs.innerHTML = `<div class="empty-state">Belum ada aktivitas transaksi.</div>`;
  }
}

function showReceipt(trxId) {
  const trx = globalTransactions.find(item => item.id === trxId);
  if (!trx) return alert("Resi tidak ditemukan.");

  let kodeTrx = trx.receiptCode || ("TRX-" + trxId.substring(0, 6).toUpperCase());
  let pengirim = trx.username || "-";
  let penerima = trx.targetUser || (trx.requester ? `@${trx.requester}` : "SYSTEM / Bendahara");

  let resiText = `
╔═══════════════════════════════════╗
         📄 RESI TRANSAKSI RESMI           
╚═══════════════════════════════════╝
• Kode Transaksi : ${kodeTrx}
• Jenis Transaksi: ${trx.type}
• Tanggal & Waktu: ${trx.time}
• Nominal        : Rp ${Number(trx.amount).toLocaleString('id-ID')}
• Pengirim       : @${pengirim}
• Penerima       : ${penerima}
• Status         : ${trx.status}
-------------------------------------
✅ Transaksi resmi dan tercatat di sistem Tabungan Rakyat.
  `.trim();

  alert(resiText);
}

function showMonthlySummary() {
  const box = document.getElementById("rekap-content-box");
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);
  let totalMasuk = 0, totalKeluar = 0;

  globalTransactions.forEach(t => {
    if (t.status === "Disetujui" && t.rawDate) {
      let tDate = new Date(t.rawDate);
      if (tDate >= oneMonthAgo && tDate <= now) {
        let amt = Number(t.amount) || 0;
        if (t.username === currentUser.username && (t.type.includes("Transfer") || t.type.includes("Tarik"))) {
          totalKeluar += amt;
        } else {
          totalMasuk += amt;
        }
      }
    }
  });

  box.innerHTML = `
    <div class="log-info-box"><div class="log-label">Total Pemasukan (1 Bulan):</div><div class="log-value-success">Rp ${totalMasuk.toLocaleString('id-ID')}</div></div>
    <div class="log-info-box"><div class="log-label">Total Pengeluaran (1 Bulan):</div><div class="log-value-primary" style="color: #f87171;">Rp ${totalKeluar.toLocaleString('id-ID')}</div></div>
  `;
}

// ==========================================
// 8. FITUR SOSIAL (PERTEMANAN & CHAT)
// ==========================================
function populateAvailableUsersForFriend() {
  const selectEl = document.getElementById("available-users-select");
  if (!selectEl) return;
  db.ref("users").once("value", (snap) => {
    const users = snap.val() || {};
    let html = `<option value="">-- Pilih Warga Terdaftar --</option>`;
    Object.keys(users).forEach(uKey => {
      let u = users[uKey];
      if (u.role !== 'admin' && uKey !== currentUser.username) {
        html += `<option value="${uKey}">@${uKey} (${u.fullname || uKey})</option>`;
      }
    });
    selectEl.innerHTML = html;
  });
}

function sendFriendRequest() {
  const target = document.getElementById("available-users-select").value;
  if (!target) return alert("Pilih warga terlebih dahulu!");
  db.ref(`friend_requests/${target}/${currentUser.username}`).set({
    requester: currentUser.username,
    time: new Date().toLocaleString('id-ID'),
    status: "pending"
  }, (err) => {
    if (!err) alert(`Permintaan pertemanan terkirim ke @${target}!`);
  });
}

function loadFriendRequests() {
  const list = document.getElementById("friend-requests-list");
  db.ref(`friend_requests/${currentUser.username}`).on("value", (snap) => {
    const reqs = snap.val();
    if (!reqs) { list.innerHTML = `<div class="empty-state">Tidak ada permintaan.</div>`; return; }
    let html = "";
    Object.keys(reqs).forEach(reqUser => {
      if (reqs[reqUser].status === "pending") {
        html += `<div class="list-item" style="padding: 8px 12px;"><div><b>@${reqUser}</b></div><div style="display: flex; gap: 5px;"><button class="btn-action btn-acc" onclick="acceptFriend('${reqUser}')">Terima</button><button class="btn-action btn-reject" onclick="rejectFriend('${reqUser}')">Tolak</button></div></div>`;
      }
    });
    list.innerHTML = html || `<div class="empty-state">Tidak ada permintaan.</div>`;
  });
}

function acceptFriend(friendUser) {
  const updates = {};
  updates[`friends/${currentUser.username}/${friendUser}/status`] = "accepted";
  updates[`friends/${friendUser}/${currentUser.username}/status`] = "accepted";
  updates[`friend_requests/${currentUser.username}/${friendUser}`] = null;
  db.ref().update(updates, () => loadFriendsList());
}

function rejectFriend(friendUser) {
  db.ref(`friend_requests/${currentUser.username}/${friendUser}`).remove();
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
    let html = "", selectHtml = `<option value="">-- Pilih Teman --</option>`;
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
        let m = msgs[k];
        box.innerHTML += `<div class="chat-bubble ${m.sender === currentUser.username ? 'chat-me' : 'chat-admin'}">${m.text}</div>`;
      });
      box.scrollTop = box.scrollHeight;
    } else {
      box.innerHTML = `<div class="empty-state">Mulai mengobrol...</div>`;
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

function listenUserChat() {
  if (!db || !currentUser) return;
  db.ref("chats/" + currentUser.username).on("value", (snap) => {
    const box = document.getElementById("user-chat-box");
    if(!box) return;
    box.innerHTML = "";
    const chats = snap.val();
    if (chats) {
      Object.keys(chats).forEach(k => {
        let c = chats[k];
        box.innerHTML += `<div class="chat-bubble ${c.sender === 'user' ? 'chat-me' : 'chat-admin'}">${c.text}</div>`;
      });
      box.scrollTop = box.scrollHeight;
    } else {
      box.innerHTML = `<div class="empty-state">Belum ada obrolan dengan Admin.</div>`;
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
  if (db && currentUser) db.ref("users/" + currentUser.username).update({ isOnline: false });
  localStorage.clear(); sessionStorage.clear();
  window.location.href = "index.html";
}

// ==========================================
// 9. LOGIKA DASHBOARD ADMIN (DIJAMIN BERSIH)
// ==========================================
function initAdminDashboard() {
  const session = JSON.parse(localStorage.getItem("loggedUser") || sessionStorage.getItem("loggedUser"));
  if (!session || session.role !== "admin") { window.location.href = "loginadmin.html"; return; }
  bindAdminEvents();
  if (db) {
    db.ref("users").on("value", (snap) => { globalUsers = snap.val() || {}; updateAdminUserOptions(); renderAdminAllData(); });
    
    // PROTEKSI UTAMA: Admin hanya mengambil transaksi selain jenis "Permintaan Saldo"
    db.ref("transactions").on("value", (snap) => {
      const trxs = snap.val() || {};
      globalTrxs = {};
      Object.keys(trxs).forEach(key => {
        const t = trxs[key];
        // Pastikan transaksi bertipe permintaan saldo dibuang mutlak dari memori admin
        if (t && t.type && (t.type.includes("Permintaan Saldo") || t.type.includes("Minta Saldo"))) {
          return; 
        }
        globalTrxs[key] = t;
      });
      renderAdminAllData();
    });
  }
}

function bindAdminEvents() {
  const sidebar = document.getElementById("sidebar");
  const btnToggle = document.getElementById("btn-toggle-sidebar");
  const btnClose = document.getElementById("btn-close-sidebar");

  if(btnToggle) {
    btnToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('show');
    });
  }

  if(btnClose) {
    btnClose.addEventListener("click", () => {
      sidebar.classList.remove('show');
    });
  }

  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 992 && sidebar.classList.contains('show')) {
      if (!sidebar.contains(e.target) && !btnToggle.contains(e.target)) {
        sidebar.classList.remove('show');
      }
    }
  });

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
        if (window.innerWidth <= 992) sidebar.classList.remove('show');
      });
    }
  });

  document.getElementById("btn-admin-logout").addEventListener("click", () => { localStorage.clear(); window.location.href = "loginadmin.html"; });
  document.getElementById("btn-admin-send-chat").addEventListener("click", sendAdminChat);
}

function updateAdminUserOptions() {
  const filterSel = document.getElementById("filter-user-history");
  const chatSel = document.getElementById("chat-user-selector");
  if(!filterSel || !chatSel) return;
  let filterHtml = `<option value="ALL">-- Tampilkan Semua Warga --</option>`;
  let chatHtml = "";
  Object.keys(globalUsers).forEach(username => {
    let u = globalUsers[username];
    if (u.role !== 'admin') {
      filterHtml += `<option value="${username}">${u.fullname || username} (@${username})</option>`;
      chatHtml += `<option value="${username}">${u.fullname || username} (@${username})</option>`;
    }
  });
  filterSel.innerHTML = filterHtml; chatSel.innerHTML = chatHtml;
}

function renderAdminAllData() {
  let totalKasTabungan = 0, countPending = 0;
  const selectedUserFilter = document.getElementById("filter-user-history")?.value || "ALL";
  const tbVerif = document.getElementById("tb-verifikasi");
  const tbRiwayat = document.getElementById("tb-riwayat-all");
  if(tbVerif) tbVerif.innerHTML = "";
  if(tbRiwayat) tbRiwayat.innerHTML = "";

  Object.keys(globalTrxs).reverse().forEach(key => {
    const trx = globalTrxs[key];
    if (!trx) return;

    if (trx.status === 'Pending') {
      countPending++;
      if(tbVerif) {
        tbVerif.innerHTML += `<tr><td>${trx.time||'-'}</td><td><b>@${trx.username||'-'}</b></td><td><b>${trx.type}</b></td><td>Rp ${(Number(trx.amount)||0).toLocaleString('id-ID')}</td><td><span class="badge badge-pending">Pending</span></td><td><button class="btn-action btn-acc" onclick="accTrx('${key}')">ACC</button> <button class="btn-action btn-reject" onclick="rejTrx('${key}')">Tolak</button></td></tr>`;
      }
    } else {
      if (selectedUserFilter === "ALL" || selectedUserFilter === trx.username) {
        if(tbRiwayat) {
          tbRiwayat.innerHTML += `<tr><td>${trx.time||'-'}</td><td><b>@${trx.username||'-'}</b></td><td><b>${trx.type}</b></td><td>Rp ${(Number(trx.amount)||0).toLocaleString('id-ID')}</td><td><span class="badge badge-success">Disetujui</span></td><td><button class="btn-action btn-del" onclick="deleteTrx('${key}')">Hapus</button></td></tr>`;
        }
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
      if (tbMod) tbMod.innerHTML += `<tr><td><b>@${username}</b></td><td><span class="badge ${u.status==='banned'?'badge-danger':'badge-success'}">${u.status||'active'}</span></td><td>${u.warning||'-'}</td><td><button class="btn-action ${u.status==='active'?'btn-reject':'btn-acc'}" onclick="toggleBan('${username}', '${u.status==='active'?'banned':'active'}')">${u.status==='active'?'Ban':'Unban'}</button> <button class="btn-action btn-del" onclick="hapusUser('${username}')">Hapus</button></td></tr>`;
      if (tbStatus) tbStatus.innerHTML += `<tr><td>${u.fullname||'-'}</td><td>@${username}</td><td>${u.lastLogin||'-'}</td><td><span class="badge ${u.isOnline?'badge-success':'badge-danger'}">${u.isOnline?'Online':'Offline'}</span></td></tr>`;
      if (tbDataWarga) tbDataWarga.innerHTML += `<tr><td>${u.fullname||'-'}</td><td>@${username}</td><td>${u.email||'-'}</td><td>${u.phone||'-'}</td><td>${u.birthPlace||'-'}</td><td>${u.bank||'-'}</td><td>${u.accountName||'-'}</td><td>${u.accountNumber||'-'}</td><td>${u.birthDate||'-'}</td><td>${u.motherName||'-'}</td><td><span style="font-family:monospace; color:#38bdf8; font-weight:bold;">${u.password||'-'}</span></td></tr>`;
    }
  });

  document.getElementById("m-kas-tabungan").innerText = "Rp " + totalKasTabungan.toLocaleString('id-ID');
  document.getElementById("m-pending").innerText = countPending;
}

function accTrx(trxKey) {
  const trx = globalTrxs[trxKey];
  if (!trx) return alert("Data transaksi tidak ditemukan!");

  const username = trx.username;
  const amt = Number(trx.amount) || 0;
  let tType = (trx.type || "").toLowerCase().trim();
  let recCode = "TRX-" + Math.floor(100000 + Math.random() * 900000);

  db.ref("users/" + username).once("value", (userSnap) => {
    if (!userSnap.exists()) return alert("Data warga tidak ditemukan di database!");
    const uData = userSnap.val();
    let bal = Number(uData.balance) || 0;

    if (tType === "nabung") {
      bal += amt;
      let updates = { balance: bal };
      if (amt >= 50000) updates.status = "active";
      
      db.ref("users/" + username).update(updates);
      db.ref("transactions/" + trxKey).update({ status: "Disetujui", receiptCode: recCode });
      alert("🎉 Transaksi Nabung disetujui & saldo warga bertambah!");
    } 
    else if (tType.includes("pinjaman")) {
      bal += amt;
      db.ref("users/" + username).update({ balance: bal, status: "active" });
      db.ref("transactions/" + trxKey).update({ status: "Disetujui", receiptCode: recCode });
      alert(`🎉 Pinjaman Rp ${amt.toLocaleString('id-ID')} disetujui! Saldo peminjam bertambah.`);
    } 
    else if (tType.includes("tarik saldo")) {
      if (bal < amt) {
        return alert(`Gagal ACC: Saldo warga tidak mencukupi!`);
      }
      bal -= amt;
      
      db.ref("users/" + username).update({ balance: bal }, (err) => {
        if (!err) {
          db.ref("transactions/" + trxKey).update({ status: "Disetujui", receiptCode: recCode });
          alert("🎉 Penarikan saldo berhasil disetujui & saldo dipotong.");
        }
      });
    } 
    else if (tType.includes("transfer ke")) {
      if (bal < amt) {
        return alert(`Gagal ACC: Saldo pengirim tidak mencukupi!`);
      }
      bal -= amt;
      db.ref("users/" + username).update({ balance: bal });

      let targetUser = trx.targetUser;
      if (targetUser) {
        db.ref("users/" + targetUser).once("value", (tSnap) => {
          let targetBal = tSnap.exists() ? (Number(tSnap.val().balance) || 0) : 0;
          db.ref("users/" + targetUser).update({ balance: targetBal + amt });
        });
      }

      db.ref("transactions/" + trxKey).update({ status: "Disetujui", receiptCode: recCode });
      alert(`🎉 Transfer disetujui & saldo pengirim dipotong!`);
    } 
    else {
      db.ref("transactions/" + trxKey).update({ status: "Disetujui", receiptCode: recCode });
      alert("🎉 Transaksi berhasil disetujui!");
    }
  });
}

function rejTrx(trxKey) { db.ref("transactions/" + trxKey).update({ status: "Ditolak" }); }
function deleteTrx(trxKey) { db.ref("transactions/" + trxKey).remove(); }
function editSaldo(username) {
  let nb = prompt("Edit Saldo (Rp):");
  if(nb !== null) db.ref("users/" + username).update({ balance: parseInt(nb) || 0 });
}
function toggleBan(username, status) { db.ref("users/" + username).update({ status: status }); }
function hapusUser(username) {
  if (confirm(`Hapus akun @${username}?`)) {
    db.ref("users/" + username).remove();
    db.ref("chats/" + username).remove();
  }
}

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
        let c = chats[k];
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

// ==========================================
// 10. TOAST NOTIFIKASI MELAYANG
// ==========================================
const mockWargaList = [
  { name: "Darwin Simanjuntak", amount: 100000 },
  { name: "Halimah", amount: 150000 },
  { name: "Fadilah", amount: 100000 }
];
let lastToastIndex = -1;

function triggerWithdrawalToast() {
  const toastEl = document.getElementById("toast-withdrawal");
  const toastText = document.getElementById("toast-withdrawal-text");
  if (!toastEl || !toastText) return;
  let randomIndex = Math.floor(Math.random() * mockWargaList.length);
  if (randomIndex === lastToastIndex) randomIndex = (randomIndex + 1) % mockWargaList.length;
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
