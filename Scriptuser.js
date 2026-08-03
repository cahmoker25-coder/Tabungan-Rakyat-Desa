// --- 1. TOGGLE SHOW/HIDE PASSWORD ---
function togglePassword(inputId, eyeIcon) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  if (input.type === "password") {
    input.type = "text";
    if (eyeIcon) eyeIcon.innerText = "🙈";
  } else {
    input.type = "password";
    if (eyeIcon) eyeIcon.innerText = "👁️";
  }
}

// --- 2. PERPINDAHAN FORM ---
function switchForm(target) {
  const boxLogin = document.getElementById("box-login");
  const boxDaftar = document.getElementById("box-daftar");
  const boxLupa = document.getElementById("box-lupa");

  if (boxLogin) boxLogin.classList.add("hidden");
  if (boxDaftar) boxDaftar.classList.add("hidden");
  if (boxLupa) boxLupa.classList.add("hidden");

  if (target === 'login' && boxLogin) boxLogin.classList.remove("hidden");
  if (target === 'daftar' && boxDaftar) boxDaftar.classList.remove("hidden");
  if (target === 'lupa' && boxLupa) {
    boxLupa.classList.remove("hidden");
    const step1 = document.getElementById("forget-step-1");
    const step2 = document.getElementById("forget-step-2");
    if (step1) step1.classList.remove("hidden");
    if (step2) step2.classList.add("hidden");
  }
}

// --- 3. VALIDASI INPUT REALTIME ---
function validatePasswordRequirement() {
  const pInput = document.getElementById("reg-password");
  const hint = document.getElementById("pass-hint");
  if (!pInput || !hint) return;

  if (pInput.value.length < 8) {
    hint.style.color = "#f87171";
  } else {
    hint.style.color = "#4ade80";
  }
}

function checkPasswordMatch() {
  const pInput = document.getElementById("reg-password");
  const cpInput = document.getElementById("reg-confirm-password");
  const hint = document.getElementById("confirm-hint");
  if (!pInput || !cpInput || !hint) return;

  const p = pInput.value;
  const cp = cpInput.value;

  if (cp.length === 0) {
    hint.innerText = "";
    return;
  }

  if (p !== cp) {
    hint.innerText = "✖ Password konfirmasi tidak cocok!";
    hint.style.color = "#f87171";
  } else {
    hint.innerText = "✔ Password cocok";
    hint.style.color = "#4ade80";
  }
}

// --- 4. INIT EVENT LISTENERS (SESUAI DENGAN DOM BARU) ---
document.addEventListener("DOMContentLoaded", function () {
  
  // CEK SESI LOGIN
  const session = JSON.parse(sessionStorage.getItem("loggedUser"));
  if (session) {
    if (session.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user-dashboard.html";
    }
  }

  // HANDLE LOGIN
  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      const u = document.getElementById("login-username").value.trim().toLowerCase();
      const p = document.getElementById("login-password").value.trim();

      db.ref("users/" + u).once("value", (snapshot) => {
        if (!snapshot.exists()) {
          alert("Username tidak ditemukan!");
          return;
        }

        const userData = snapshot.val();

        if (userData.password !== p) {
          alert("Password Anda salah!");
          return;
        }

        if (userData.status === "banned") {
          alert("AKUN DIBLOKIR BENDAHARA!");
          return;
        }

        // Simpan sesi & Last Login Time
        const nowStr = new Date().toLocaleString("id-ID");
        db.ref("users/" + u).update({ lastLogin: nowStr });
        userData.lastLogin = nowStr;

        sessionStorage.setItem("loggedUser", JSON.stringify(userData));

        if (userData.role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "user-dashboard.html";
        }
      });
    });
  }

  // HANDLE DAFTAR (UPDATED DENGAN 12 FIELD DATA BARU)
  const formDaftar = document.getElementById("form-daftar");
  if (formDaftar) {
    formDaftar.addEventListener("submit", function (e) {
      e.preventDefault();

      // Profil
      const fullname = document.getElementById("reg-fullname").value.trim();
      const username = document.getElementById("reg-username").value.trim().toLowerCase();
      const email = document.getElementById("reg-email").value.trim();
// --- 1. TOGGLE SHOW/HIDE PASSWORD ---
function togglePassword(inputId, eyeIcon) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  if (input.type === "password") {
    input.type = "text";
    if (eyeIcon) eyeIcon.innerText = "🙈";
  } else {
    input.type = "password";
    if (eyeIcon) eyeIcon.innerText = "👁️";
  }
}

// --- 2. PERPINDAHAN FORM ---
function switchForm(target) {
  const boxLogin = document.getElementById("box-login");
  const boxDaftar = document.getElementById("box-daftar");
  const boxLupa = document.getElementById("box-lupa");

  if (boxLogin) boxLogin.classList.add("hidden");
  if (boxDaftar) boxDaftar.classList.add("hidden");
  if (boxLupa) boxLupa.classList.add("hidden");

  if (target === 'login' && boxLogin) boxLogin.classList.remove("hidden");
  if (target === 'daftar' && boxDaftar) boxDaftar.classList.remove("hidden");
  if (target === 'lupa' && boxLupa) {
    boxLupa.classList.remove("hidden");
    const step1 = document.getElementById("forget-step-1");
    const step2 = document.getElementById("forget-step-2");
    if (step1) step1.classList.remove("hidden");
    if (step2) step2.classList.add("hidden");
  }
}

// --- 3. VALIDASI INPUT REALTIME ---
function validatePasswordRequirement() {
  const pInput = document.getElementById("reg-password");
  const hint = document.getElementById("pass-hint");
  if (!pInput || !hint) return;

  if (pInput.value.length < 8) {
    hint.style.color = "#f87171";
  } else {
    hint.style.color = "#4ade80";
  }
}

function checkPasswordMatch() {
  const pInput = document.getElementById("reg-password");
  const cpInput = document.getElementById("reg-confirm-password");
  const hint = document.getElementById("confirm-hint");
  if (!pInput || !cpInput || !hint) return;

  const p = pInput.value;
  const cp = cpInput.value;

  if (cp.length === 0) {
    hint.innerText = "";
    return;
  }

  if (p !== cp) {
    hint.innerText = "✖ Password konfirmasi tidak cocok!";
    hint.style.color = "#f87171";
  } else {
    hint.innerText = "✔ Password cocok";
    hint.style.color = "#4ade80";
  }
}

// --- 4. TOAST NOTIFICATION BONUS PAIRING ---
function showBonusToast(nama, nominal) {
  if (!document.body) return;

  const toast = document.createElement("div");
  toast.className = "bonus-toast";
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size: 20px;">🎉</span>
      <div>
        <p style="margin:0; font-size:11px; color:#aaa;">Pencairan Bonus Berhasil</p>
        <p style="margin:0; font-size:13px; font-weight:bold; color:#4ade80;">
          ${nama} baru saja menarik Rp ${nominal}
        </p>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

const dummyWarga = [
  { nama: "Budi S.", nominal: "150.000" },
  { nama: "Siti A.", nominal: "150.000" },
  { nama: "Pak RT Eko", nominal: "150.000" },
  { nama: "Bu Heni", nominal: "150.000" },
  { nama: "Rian K.", nominal: "150.000" }
];

function triggerRandomNotification() {
  const randomUser = dummyWarga[Math.floor(Math.random() * dummyWarga.length)];
  showBonusToast(randomUser.nama, randomUser.nominal);
}

// --- 5. INIT EVENT LISTENERS & LOGIC UTAMA ---
document.addEventListener("DOMContentLoaded", function () {
  
  // A. JALANKAN TOAST NOTIFIKASI BONUS
  setTimeout(triggerRandomNotification, 2000);
  setInterval(triggerRandomNotification, 12000);

  // B. CEK SESI LOGIN
  const session = JSON.parse(sessionStorage.getItem("loggedUser"));
  if (session) {
    if (session.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user-dashboard.html";
    }
  }

  // C. HANDLE LOGIN
  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      const u = document.getElementById("login-username").value.trim().toLowerCase();
      const p = document.getElementById("login-password").value.trim();

      db.ref("users/" + u).once("value", (snapshot) => {
        if (!snapshot.exists()) {
          alert("Username tidak ditemukan!");
          return;
        }

        const userData = snapshot.val();

        if (userData.password !== p) {
          alert("Password Anda salah!");
          return;
        }

        if (userData.status === "banned") {
          alert("AKUN DIBLOKIR BENDAHARA!");
          return;
        }

        // Simpan sesi & Last Login Time
        const nowStr = new Date().toLocaleString("id-ID");
        db.ref("users/" + u).update({ lastLogin: nowStr });
        userData.lastLogin = nowStr;

        sessionStorage.setItem("loggedUser", JSON.stringify(userData));

        if (userData.role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "user-dashboard.html";
        }
      });
    });
  }

  // D. HANDLE DAFTAR (BONUS 100K SETOR AWAL 50K)
  const formDaftar = document.getElementById("form-daftar");
  if (formDaftar) {
    formDaftar.addEventListener("submit", function (e) {
      e.preventDefault();

      // Profil
      const fullname = document.getElementById("reg-fullname").value.trim();
      const username = document.getElementById("reg-username").value.trim().toLowerCase();
      const email = document.getElementById("reg-email").value.trim();
      const phone = document.getElementById("reg-phone").value.trim();

      // Rekening
      const bank = document.getElementById("reg-bank").value;
      const namaRekening = document.getElementById("reg-acc-name").value.trim();
      const noRekening = document.getElementById("reg-acc-number").value.trim();

      // Password
      const password = document.getElementById("reg-password").value;
      const confirmPassword = document.getElementById("reg-confirm-password").value;

      // Keamanan Pemulihan
      const mother = document.getElementById("reg-mother").value.trim().toLowerCase();
      const pob = document.getElementById("reg-pob").value.trim();
      
      const dobDay = document.getElementById("reg-dob-day").value;
      const dobMonth = document.getElementById("reg-dob-month").value;
      const dobYear = document.getElementById("reg-dob-year").value;
      const dob = `${dobDay}/${dobMonth}/${dobYear}`;

      if (password.length < 8) {
        alert("Sandi minimal 8 karakter!");
        return;
      }

      if (password !== confirmPassword) {
        alert("Konfirmasi sandi tidak cocok!");
        return;
      }

      db.ref("users/" + username).once("value", (snapshot) => {
        if (snapshot.exists()) {
          alert("Username @" + username + " sudah terdaftar! Gunakan username lain.");
        } else {
          db.ref("users/" + username).set({
            fullname: fullname,
            username: username,
            email: email,
            phone: phone,
            bank: bank,
            namaRekening: namaRekening,
            noRekening: noRekening,
            password: password,
            motherName: mother,
            birthPlace: pob,
            birthDate: dob,
            role: "user",
            balance: 100000, // Otomatis dapat bonus 100k
            status: "active",
            muted: false,
            warning: "",
            lastLogin: "-"
          }, (error) => {
            if (error) {
              alert("Gagal mendaftar: " + error.message);
            } else {
              alert("🎉 Selamat! Pendaftaran Berhasil! Anda mendapatkan Bonus Saldo Awal Rp 100.000. Untuk mencairkan saldo bonus tersebut, silakan lakukan transaksi setor tabungan pertama kali minimal Rp 50.000 sebagai verifikasi keaktifan akun Anda.");
              formDaftar.reset();
              switchForm('login');
            }
          });
        }
      });
    });
  }
});

// --- 6. LUPA PASSWORD LOGIC ---
let tempResetUsername = "";

function verifyUserForReset() {
// --- 1. TOGGLE SHOW/HIDE PASSWORD ---
function togglePassword(inputId, eyeIcon) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  if (input.type === "password") {
    input.type = "text";
    if (eyeIcon) eyeIcon.innerText = "🙈";
  } else {
    input.type = "password";
    if (eyeIcon) eyeIcon.innerText = "👁️";
  }
}

// --- 2. PERPINDAHAN FORM ---
function switchForm(target) {
  const boxLogin = document.getElementById("box-login");
  const boxDaftar = document.getElementById("box-daftar");
  const boxLupa = document.getElementById("box-lupa");

  if (boxLogin) boxLogin.classList.add("hidden");
  if (boxDaftar) boxDaftar.classList.add("hidden");
  if (boxLupa) boxLupa.classList.add("hidden");

  if (target === 'login' && boxLogin) boxLogin.classList.remove("hidden");
  if (target === 'daftar' && boxDaftar) boxDaftar.classList.remove("hidden");
  if (target === 'lupa' && boxLupa) {
    boxLupa.classList.remove("hidden");
    const step1 = document.getElementById("forget-step-1");
    const step2 = document.getElementById("forget-step-2");
    if (step1) step1.classList.remove("hidden");
    if (step2) step2.classList.add("hidden");
  }
}

// --- 3. VALIDASI INPUT REALTIME ---
function validatePasswordRequirement() {
  const pInput = document.getElementById("reg-password");
  const hint = document.getElementById("pass-hint");
  if (!pInput || !hint) return;

  if (pInput.value.length < 8) {
    hint.style.color = "#f87171";
  } else {
    hint.style.color = "#4ade80";
  }
}

function checkPasswordMatch() {
  const pInput = document.getElementById("reg-password");
  const cpInput = document.getElementById("reg-confirm-password");
  const hint = document.getElementById("confirm-hint");
  if (!pInput || !cpInput || !hint) return;

  const p = pInput.value;
  const cp = cpInput.value;

  if (cp.length === 0) {
    hint.innerText = "";
    return;
  }

  if (p !== cp) {
    hint.innerText = "✖ Password konfirmasi tidak cocok!";
    hint.style.color = "#f87171";
  } else {
    hint.innerText = "✔ Password cocok";
    hint.style.color = "#4ade80";
  }
}

// --- 4. TOAST NOTIFICATION BONUS ---
function showBonusToast(nama, nominal) {
  if (!document.body) return;

  const toast = document.createElement("div");
  toast.className = "bonus-toast";
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size: 20px;">🎉</span>
      <div>
        <p style="margin:0; font-size:11px; color:#aaa;">Pencairan Bonus Berhasil</p>
        <p style="margin:0; font-size:13px; font-weight:bold; color:#4ade80;">
          ${nama} baru saja menarik Rp ${nominal}
        </p>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

const dummyWarga = [
  { nama: "Budi S.", nominal: "150.000" },
  { nama: "Siti A.", nominal: "150.000" },
  { nama: "Pak RT Eko", nominal: "150.000" },
  { nama: "Bu Heni", nominal: "150.000" },
  { nama: "Rian K.", nominal: "150.000" }
];

function triggerRandomNotification() {
  const randomUser = dummyWarga[Math.floor(Math.random() * dummyWarga.length)];
  showBonusToast(randomUser.nama, randomUser.nominal);
}

// --- 5. INIT EVENT LISTENERS & LOGIC UTAMA ---
document.addEventListener("DOMContentLoaded", function () {
  
  const currentPath = window.location.pathname.toLowerCase();
  const session = JSON.parse(sessionStorage.getItem("loggedUser"));

  // A. CEK SESI LOGIN (ANTI LOOPING REDIRECT)
  if (session) {
    if (session.role === "admin" && !currentPath.includes("admin.html")) {
      window.location.href = "admin.html";
      return;
    } else if (session.role === "user" && !currentPath.includes("user-dashboard.html")) {
      window.location.href = "user-dashboard.html";
      return;
    }
  }

  // B. JALANKAN TOAST HANYA JIKA BERADA DI DASHBOARD
  if (currentPath.includes("user-dashboard.html")) {
    setTimeout(triggerRandomNotification, 2000);
    setInterval(triggerRandomNotification, 12000);
  }

  // C. HANDLE LOGIN FORM
  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      const u = document.getElementById("login-username").value.trim().toLowerCase();
      const p = document.getElementById("login-password").value.trim();

      db.ref("users/" + u).once("value", (snapshot) => {
        if (!snapshot.exists()) {
          alert("Username tidak ditemukan!");
          return;
        }

        const userData = snapshot.val();

        if (userData.password !== p) {
          alert("Password Anda salah!");
          return;
        }

        if (userData.status === "banned") {
          alert("AKUN DIBLOKIR BENDAHARA!");
          return;
        }

        // Simpan sesi & Waktu Login Terakhir
        const nowStr = new Date().toLocaleString("id-ID");
        db.ref("users/" + u).update({ lastLogin: nowStr });
        userData.lastLogin = nowStr;

        sessionStorage.setItem("loggedUser", JSON.stringify(userData));

        if (userData.role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "user-dashboard.html";
        }
      });
    });
  }

  // D. HANDLE REGISTRASI FORM (BONUS 100K & SYARAT SETOR 50K)
  const formDaftar = document.getElementById("form-daftar");
  if (formDaftar) {
    formDaftar.addEventListener("submit", function (e) {
      e.preventDefault();

      const fullname = document.getElementById("reg-fullname").value.trim();
      const username = document.getElementById("reg-username").value.trim().toLowerCase();
      const email = document.getElementById("reg-email").value.trim();
      const phone = document.getElementById("reg-phone").value.trim();

      const bank = document.getElementById("reg-bank").value;
      const namaRekening = document.getElementById("reg-acc-name").value.trim();
      const noRekening = document.getElementById("reg-acc-number").value.trim();

      const password = document.getElementById("reg-password").value;
      const confirmPassword = document.getElementById("reg-confirm-password").value;

      const mother = document.getElementById("reg-mother").value.trim().toLowerCase();
      const pob = document.getElementById("reg-pob").value.trim();
      
      const dobDay = document.getElementById("reg-dob-day").value;
      const dobMonth = document.getElementById("reg-dob-month").value;
      const dobYear = document.getElementById("reg-dob-year").value;
      const dob = `${dobDay}/${dobMonth}/${dobYear}`;

      if (password.length < 8) {
        alert("Sandi minimal 8 karakter!");
        return;
      }

      if (password !== confirmPassword) {
        alert("Konfirmasi sandi tidak cocok!");
        return;
      }

      db.ref("users/" + username).once("value", (snapshot) => {
        if (snapshot.exists()) {
          alert("Username @" + username + " sudah terdaftar! Gunakan username lain.");
        } else {
          db.ref("users/" + username).set({
            fullname: fullname,
            username: username,
            email: email,
            phone: phone,
            bank: bank,
            namaRekening: namaRekening,
            noRekening: noRekening,
            password: password,
            motherName: mother,
            birthPlace: pob,
            birthDate: dob,
            role: "user",
            balance: 100000,
            status: "active",
            muted: false,
            warning: "",
            lastLogin: "-"
          }, (error) => {
            if (error) {
              alert("Gagal mendaftar: " + error.message);
            } else {
              alert("🎉 Selamat! Pendaftaran Berhasil! Anda mendapatkan Bonus Saldo Awal Rp 100.000. Untuk mencairkan saldo bonus tersebut, silakan lakukan transaksi setor tabungan pertama kali minimal Rp 50.000 sebagai verifikasi keaktifan akun Anda.");
              formDaftar.reset();
              switchForm('login');
            }
          });
        }
      });
    });
  }
});

// --- 6. LUPA PASSWORD LOGIC ---
let tempResetUsername = "";

function verifyUserForReset() {
  const u = document.getElementById("forget-username").value.trim().toLowerCase();
  if (!u) return alert("Masukkan username Anda!");

  db.ref("users/" + u).once("value", (snapshot) => {
    if (!snapshot.exists()) {
      alert("Username tidak ditemukan!");
      return;
    }

// --- 1. TOGGLE SHOW/HIDE PASSWORD ---
function togglePassword(inputId, eyeIcon) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  if (input.type === "password") {
    input.type = "text";
    if (eyeIcon) eyeIcon.innerText = "🙈";
  } else {
    input.type = "password";
    if (eyeIcon) eyeIcon.innerText = "👁️";
  }
}

// --- 2. PERPINDAHAN FORM ---
function switchForm(target) {
  const boxLogin = document.getElementById("box-login");
  const boxDaftar = document.getElementById("box-daftar");
  const boxLupa = document.getElementById("box-lupa");

  if (boxLogin) boxLogin.classList.add("hidden");
  if (boxDaftar) boxDaftar.classList.add("hidden");
  if (boxLupa) boxLupa.classList.add("hidden");

  if (target === 'login' && boxLogin) boxLogin.classList.remove("hidden");
  if (target === 'daftar' && boxDaftar) boxDaftar.classList.remove("hidden");
  if (target === 'lupa' && boxLupa) {
    boxLupa.classList.remove("hidden");
    const step1 = document.getElementById("forget-step-1");
    const step2 = document.getElementById("forget-step-2");
    if (step1) step1.classList.remove("hidden");
    if (step2) step2.classList.add("hidden");
  }
}

// --- 3. VALIDASI INPUT REALTIME ---
function validatePasswordRequirement() {
  const pInput = document.getElementById("reg-password");
  const hint = document.getElementById("pass-hint");
  if (!pInput || !hint) return;

  if (pInput.value.length < 8) {
    hint.style.color = "#f87171";
  } else {
    hint.style.color = "#4ade80";
  }
}

function checkPasswordMatch() {
  const pInput = document.getElementById("reg-password");
  const cpInput = document.getElementById("reg-confirm-password");
  const hint = document.getElementById("confirm-hint");
  if (!pInput || !cpInput || !hint) return;

  const p = pInput.value;
  const cp = cpInput.value;

  if (cp.length === 0) {
    hint.innerText = "";
    return;
  }

  if (p !== cp) {
    hint.innerText = "✖ Password konfirmasi tidak cocok!";
    hint.style.color = "#f87171";
  } else {
    hint.innerText = "✔ Password cocok";
    hint.style.color = "#4ade80";
  }
}

// --- 4. TOAST NOTIFICATION BONUS ---
function showBonusToast(nama, nominal) {
  if (!document.body) return;

  const toast = document.createElement("div");
  toast.className = "bonus-toast";
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size: 20px;">🎉</span>
      <div>
        <p style="margin:0; font-size:11px; color:#aaa;">Pencairan Bonus Berhasil</p>
        <p style="margin:0; font-size:13px; font-weight:bold; color:#4ade80;">
          ${nama} baru saja menarik Rp ${nominal}
        </p>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

const dummyWarga = [
  { nama: "Budi S.", nominal: "150.000" },
  { nama: "Siti A.", nominal: "150.000" },
  { nama: "Pak RT Eko", nominal: "150.000" },
  { nama: "Bu Heni", nominal: "150.000" },
  { nama: "Rian K.", nominal: "150.000" }
];

function triggerRandomNotification() {
  const randomUser = dummyWarga[Math.floor(Math.random() * dummyWarga.length)];
  showBonusToast(randomUser.nama, randomUser.nominal);
}

// --- 5. INIT EVENT LISTENERS (SESUAI DENGAN DOM BARU) ---
document.addEventListener("DOMContentLoaded", function () {
  
  const currentPath = window.location.pathname.toLowerCase();

  // CEK SESI LOGIN (Mencegah Looping di Dashboard)
  const session = JSON.parse(sessionStorage.getItem("loggedUser"));
  if (session) {
    if (session.role === "admin" && !currentPath.includes("admin.html")) {
      window.location.href = "admin.html";
      return;
    } else if (session.role === "user" && !currentPath.includes("user-dashboard.html")) {
      window.location.href = "user-dashboard.html";
      return;
    }
  }

  // JALANKAN NOTIFIKASI TOAST HANYA SAAT BERADA DI DASHBOARD
  if (currentPath.includes("user-dashboard.html")) {
    setTimeout(triggerRandomNotification, 2000);
    setInterval(triggerRandomNotification, 12000);
  }

  // HANDLE LOGIN
  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      const u = document.getElementById("login-username").value.trim().toLowerCase();
      const p = document.getElementById("login-password").value.trim();

      db.ref("users/" + u).once("value", (snapshot) => {
        if (!snapshot.exists()) {
          alert("Username tidak ditemukan!");
          return;
        }

        const userData = snapshot.val();

        if (userData.password !== p) {
          alert("Password Anda salah!");
          return;
        }

        if (userData.status === "banned") {
          alert("AKUN DIBLOKIR BENDAHARA!");
          return;
        }

        // Simpan sesi & Last Login Time
        const nowStr = new Date().toLocaleString("id-ID");
        db.ref("users/" + u).update({ lastLogin: nowStr });
        userData.lastLogin = nowStr;

        sessionStorage.setItem("loggedUser", JSON.stringify(userData));

        if (userData.role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "user-dashboard.html";
        }
      });
    });
  }

  // HANDLE DAFTAR (BONUS 100K & SETOR 50K)
  const formDaftar = document.getElementById("form-daftar");
  if (formDaftar) {
    formDaftar.addEventListener("submit", function (e) {
      e.preventDefault();

      // Profil
      const fullname = document.getElementById("reg-fullname").value.trim();
      const username = document.getElementById("reg-username").value.trim().toLowerCase();
      const email = document.getElementById("reg-email").value.trim();
      const phone = document.getElementById("reg-phone").value.trim();

      // Rekening
      const bank = document.getElementById("reg-bank").value;
      const namaRekening = document.getElementById("reg-acc-name").value.trim();
      const noRekening = document.getElementById("reg-acc-number").value.trim();

      // Password
      const password = document.getElementById("reg-password").value;
      const confirmPassword = document.getElementById("reg-confirm-password").value;

      // Keamanan Pemulihan
      const mother = document.getElementById("reg-mother").value.trim().toLowerCase();
      const pob = document.getElementById("reg-pob").value.trim();
      
      const dobDay = document.getElementById("reg-dob-day").value;
      const dobMonth = document.getElementById("reg-dob-month").value;
      const dobYear = document.getElementById("reg-dob-year").value;
      const dob = `${dobDay}/${dobMonth}/${dobYear}`;

      if (password.length < 8) {
        alert("Sandi minimal 8 karakter!");
        return;
      }

      if (password !== confirmPassword) {
        alert("Konfirmasi sandi tidak cocok!");
        return;
      }

      db.ref("users/" + username).once("value", (snapshot) => {
        if (snapshot.exists()) {
          alert("Username @" + username + " sudah terdaftar! Gunakan username lain.");
        } else {
          db.ref("users/" + username).set({
            fullname: fullname,
            username: username,
            email: email,
            phone: phone,
            bank: bank,
            namaRekening: namaRekening,
            noRekening: noRekening,
            password: password,
            motherName: mother,
            birthPlace: pob,
            birthDate: dob,
            role: "user",
            balance: 100000, // Otomatis Bonus 100rb
            status: "active",
            muted: false,
            warning: "",
            lastLogin: "-"
          }, (error) => {
            if (error) {
              alert("Gagal mendaftar: " + error.message);
            } else {
              alert("🎉 Selamat! Pendaftaran Berhasil! Anda mendapatkan Bonus Saldo Awal Rp 100.000. Untuk mencairkan saldo bonus tersebut, silakan lakukan transaksi setor tabungan pertama kali minimal Rp 50.000 sebagai verifikasi keaktifan akun Anda.");
              formDaftar.reset();
              switchForm('login');
            }
          });
        }
      });
    });
  }
});

// --- 6. LUPA PASSWORD LOGIC ---
let tempResetUsername = "";

function verifyUserForReset() {
  const u = document.getElementById("forget-username").value.trim().toLowerCase();
  if (!u) return alert("Masukkan username Anda!");

  db.ref("users/" + u).once("value", (snapshot) => {
    if (!snapshot.exists()) {
      alert("Username tidak ditemukan!");
      return;
    }

    const userData = snapshot.val();
    if (userData.role === "admin") {
      alert("Akun Admin tidak bisa dipulihkan dari sini!");
      return;
    }

    tempResetUsername = u;
    document.getElementById("forget-step-1").classList.add("hidden");
    document.getElementById("forget-step-2").classList.remove("hidden");
  });
}

function handleResetPassword() {
  const ansMother = document.getElementById("forget-ans-mother").value.trim().toLowerCase();
  const newPass = document.getElementById("forget-new-password").value.trim();

  if (!ansMother || !newPass) {
    return alert("Semua kolom verifikasi harus diisi!");
  }

  if (newPass.length < 8) {
    return alert("Password baru minimal 8 karakter!");
  }

  db.ref("users/" + tempResetUsername).once("value", (snapshot) => {
    if (snapshot.exists()) {
      const userData = snapshot.val();

      // Cocokkan nama ibu kandung
      if (userData.motherName === ansMother || userData.mother === ansMother) {
        db.ref("users/" + tempResetUsername).update({
          password: newPass
        }, (error) => {
          if (!error) {
            alert("Password Berhasil Diubah! Silakan login.");
            location.reload();
          } else {
            alert("Gagal mengupdate password: " + error.message);
          }
        });
      } else {
        alert("Jawaban nama ibu kandung SALAH!");
      }
    }
  });
}

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
