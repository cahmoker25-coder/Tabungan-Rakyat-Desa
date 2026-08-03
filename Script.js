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
// 2. DOM READY INITIALIZER (ANTI CRASH / BUG)
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
    const session = JSON.parse(sessionStorage.getItem("loggedUser"));
    if (session && session.role !== "admin") {
      window.location.href = "user-dashboard.html";
      return;
    }

    if (typeof setupPinInputs === 'function') {
      setupPinInputs('pin-reg');
      setupPinInputs('pin-conf-reg');
      setupPinInputs('pin-forget');
    }
    
    if (typeof initRealtimePasswordCheck === 'function') {
      initRealtimePasswordCheck("reg-password", "reg-confirm-password", "pass-match-status", "rule-");
      initRealtimePasswordCheck("forget-new-pass", "forget-conf-pass", "forget-match-status", "forget-rule-");
    }
    
    if (typeof initUsernameAutoSuggest === 'function') initUsernameAutoSuggest();
    if (typeof initLoginUserHandler === 'function') initLoginUserHandler();
    if (typeof initRegisterUserHandler === 'function') initRegisterUserHandler();
  }

  // B. Inisialisasi User Dashboard (user-dashboard.html)
  const valBalance = document.getElementById("val-balance");
  if (valBalance) {
    initUserDashboard();
    startWithdrawalToastLoop();
  }

  // C. Inisialisasi Admin Dashboard (admin.html)
  const tbVerif = document.getElementById("tb-verifikasi");
  if (tbVerif && typeof initAdminDashboard === 'function') {
    initAdminDashboard();
  }
});

// ==========================================
// 3. LOGIKA DASHBOARD USER
// ==========================================
function initUserDashboard() {
  const session = JSON.parse(sessionStorage.getItem("loggedUser"));
  if (!session || session.role === "admin") {
    window.location.href = "index.html";
    return;
  }
  currentUser = session;

  db.ref("users/" + currentUser.username).on("value", (snap) => {
    if (snap.exists()) {
      currentUser = snap.val();
      const valFullname = document.getElementById("val-fullname");
      if(valFullname) valFullname.innerText = currentUser.fullname || currentUser.username;
      
      if (!isBalanceHidden) {
        const valBal = document.getElementById("val-balance");
        if(valBal) valBal.innerText = "Rp " + (currentUser.balance || 0).toLocaleString('id-ID');
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

      const warnBox = document.getElementById("box-warning");
      const textWarning = document.getElementById("text-warning");
      if (currentUser.warning) {
        if(textWarning) textWarning.innerText = currentUser.warning;
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
  });

  listenUserChat();
}

function bindUserEvents() {
  const btnEye = document.getElementById("btn-eye-balance");
  if(btnEye) btnEye.addEventListener("click", toggleBalanceHide);

  const btnOpenProf = document.getElementById("btn-open-profile");
  if(btnOpenProf) btnOpenProf.addEventListener("click", () => openModal('modal-profil'));

  document.querySelectorAll(".btn-close-modal").forEach(btn => {
    btn.addEventListener("click", function() {
      const targetModal = this.getAttribute("data-modal");
      closeModal(targetModal);
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
  
  if(navSettings) {
    navSettings.addEventListener("click", function() {
      openModal('modal-app-settings');
    });
  }

  const btnKirim = document.getElementById("btn-act-kirim");
  const btnArisan = document.getElementById("btn-act-arisan");
  const btnPinjam = document.getElementById("btn-act-pinjam");
  const btnRiwayat = document.getElementById("btn-act-riwayat");

  if(btnKirim) btnKirim.addEventListener("click", () => openModal('modal-kirim'));
  if(btnArisan) btnArisan.addEventListener("click", payArisanAuto);
  if(btnPinjam) btnPinjam.addEventListener("click", () => openModal('modal-pinjam'));
  if(btnRiwayat) btnRiwayat.addEventListener("click", () => switchNav('history', document.querySelectorAll('.nav-btn')[3]));

  const btnTarik = document.getElementById("btn-sec-tarik");
  const btnIuran = document.getElementById("btn-sec-iuran");
  const btnSumbangan = document.getElementById("btn-sec-sumbangan");
  const btnZakat = document.getElementById("btn-sec-zakat");

  if(btnTarik) btnTarik.addEventListener("click", () => openModal('modal-tarik'));
  if(btnIuran) btnIuran.addEventListener("click", () => openModalSec('Iuran Warga'));
  if(btnSumbangan) btnSumbangan.addEventListener("click", () => openModalSec('Sumbangan Kas'));
  if(btnZakat) btnZakat.addEventListener("click", () => openModalSec('Zakat & Infaq'));

  const btnSubTopup = document.getElementById("btn-submit-topup");
  const btnSubKirim = document.getElementById("btn-submit-kirim");
  const btnSubPinjam = document.getElementById("btn-submit-pinjam");
  const btnSubTarik = document.getElementById("btn-submit-tarik");
  const btnSendChat = document.getElementById("btn-send-chat");

  if(btnSubTopup) btnSubTopup.addEventListener("click", submitTopupQRIS);
  if(btnSubKirim) btnSubKirim.addEventListener("click", submitKirimSaldo);
  if(btnSubPinjam) btnSubPinjam.addEventListener("click", submitPinjamSaldo);
  if(btnSubTarik) btnSubTarik.addEventListener("click", submitTarikSaldo);
  if(btnSendChat) btnSendChat.addEventListener("click", sendChat);

  const chatInput = document.getElementById("chat-input");
  if(chatInput) {
    chatInput.addEventListener("keypress", function(e) {
      if(e.key === "Enter") {
        sendChat();
      }
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

  if (!targetUser || !amount || amount <= 0) {
    return alert("Masukkan username penerima dan nominal transfer yang valid!");
  }

  if (targetUser === currentUser.username.toLowerCase()) {
    return alert("Anda tidak dapat mengirim saldo ke akun Anda sendiri!");
  }

  if (amount > (currentUser.balance || 0)) {
    return alert("Saldo Anda tidak mencukupi untuk melakukan transfer ini!");
  }

  db.ref("users/" + targetUser).once("value", (snap) => {
    if (!snap.exists()) {
      return alert(`Warga dengan username @${targetUser} tidak ditemukan di database!`);
    }

    const targetData = snap.val();
    const recipientName = targetData.fullname || targetUser;

    db.ref("transactions").push({
      username: currentUser.username,
      targetUser: targetUser,
      type: `Transfer ke @${targetUser} (${recipientName})`,
      amount: amount,
      note: note || "-",
      status: "Pending",
      time: new Date().toLocaleDateString('id-ID') + " " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      rawDate: new Date().toISOString().split('T')[0]
    }, (err) => {
      if (!err) {
        alert(`Permintaan Transfer Rp ${amount.toLocaleString('id-ID')} ke @${targetUser} berhasil dikirim ke Admin untuk verifikasi!`);
        closeModal('modal-kirim');
        targetUserInput.value = "";
        amountInput.value = "";
        if (noteInput) noteInput.value = "";
      } else {
        alert("Gagal mengirim transaksi: " + err.message);
      }
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
  loanAmountEl.value = "";
  loanReasonEl.value = "";
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
  const amountStr = prompt(`Masukkan nominal untuk ${type} (Rp):`);
  if(!amountStr) return;
  const amount = parseInt(amountStr);
  if (amount && amount > 0) pushTransaction(type, amount);
}

function payArisanAuto() {
  if (currentUser.status === "banned" || currentUser.muted) {
    return alert("Akun Anda dibatasi oleh Bendahara!");
  }
  pushTransaction("Iuran Arisan", 25000);
}

function pushTransaction(type, amount) {
  db.ref("transactions").push({
    username: currentUser.username,
    type: type,
    amount: amount,
    status: "Pending",
    time: new Date().toLocaleDateString('id-ID') + " " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
    rawDate: new Date().toISOString().split('T')[0]
  }, (err) => {
    if (!err) {
      alert(`Permintaan ${type} sebesar Rp ${amount.toLocaleString('id-ID')} berhasil dikirim ke Admin untuk diverifikasi!`);
      switchNav('beranda', document.querySelectorAll('.nav-btn')[0]);
    } else {
      alert("Gagal mengajukan transaksi: " + err.message);
    }
  });
}

function renderUserTransactions() {
  const listRecent = document.getElementById("list-recent-history");
  const listActivity = document.getElementById("list-activity-logs");
  if(!listRecent || !listActivity) return;

  listRecent.innerHTML = ""; 
  listActivity.innerHTML = "";
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

    if (countRecent < 5) {
      listRecent.innerHTML += html;
      countRecent++;
    }
    listActivity.innerHTML += html;
  });

  if (globalTransactions.length === 0) {
    listRecent.innerHTML = `<div class="empty-state">Belum ada riwayat transaksi.</div>`;
    listActivity.innerHTML = `<div class="empty-state">Belum ada aktivitas baru.</div>`;
  }
}

// REALTIME CHAT LISTENER (INSTAN TANPA REFRESH)
function listenUserChat() {
  if (!db || !currentUser) return;
  const box = document.getElementById("user-chat-box");
  if(!box) return;

  db.ref("chats/" + currentUser.username).on("value", (snap) => {
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
    sender: "user",
    text: input.value.trim(),
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
  input.value = "";
}

function logoutUser() {
  sessionStorage.clear();
  window.location.href = "index.html";
}

// ==========================================
// 4. AUTO POP-UP NOTIFIKASI PENCAIRAN SALDO (15 DETIK)
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
    setInterval(triggerWithdrawalToast, 10000);
  }, 2000);
}
