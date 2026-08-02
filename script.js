// ==========================================
// 1. CEK SESI LOGIN DI BROWSER
// ==========================================
(function checkExistingUserSession() {
  const session = JSON.parse(sessionStorage.getItem("loggedUser"));
  if (session) {
    if (session.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user-dashboard.html";
    }
  }
})();

// ==========================================
// 2. NAVIGASI FORM (SWITCH TOGGLE)
// ==========================================
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

// Validasi Visual Password (Sesuai Syarat Hint)
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

// ==========================================
// 3. FITUR DAFTAR WARGA (FIREBASE REALTIME)
// ==========================================
function handleDaftar(e) {
  if (e) e.preventDefault();

  const fullname = document.getElementById("reg-fullname").value.trim();
  const username = document.getElementById("reg-username").value.trim().toLowerCase();
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("reg-confirm-password").value;

  // Data Keamanan / Pemulihan
  const mother = document.getElementById("reg-mother").value.trim().toLowerCase();
  const father = document.getElementById("reg-father").value.trim().toLowerCase();
  const pob = document.getElementById("reg-pob").value.trim().toLowerCase();

  if (password.length < 8) {
    alert("Password minimal 8 karakter!");
    return;
  }

  if (password !== confirmPassword) {
    alert("Konfirmasi password tidak cocok!");
    return;
  }

  // Cek Keberadaan Username di Firebase Cloud
  db.ref("users/" + username).once("value", (snapshot) => {
    if (snapshot.exists()) {
      alert("Username @" + username + " sudah terdaftar! Silakan gunakan username lain.");
    } else {
      // Simpan Ke Firebase Realtime Database Cloud
      db.ref("users/" + username).set({
        fullname: fullname,
        username: username,
        email: email,
        phone: phone,
        password: password,
        mother: mother,
        father: father,
        pob: pob,
        role: "user",
        balance: 0,
        status: "active",
        muted: false,
        warning: ""
      }, (error) => {
        if (error) {
          alert("Gagal mendaftar: " + error.message);
        } else {
          alert("Pendaftaran Berhasil! Data Anda telah terdaftar di database desa. Silakan Login.");
          const formDaftar = document.getElementById("form-daftar");
          if (formDaftar) formDaftar.reset();
          switchForm('login');
        }
      });
    }
  });
}

// ==========================================
// 4. FITUR LOGIN WARGA (FIREBASE REALTIME)
// ==========================================
function handleLogin(e) {
  if (e) e.preventDefault();

  const u = document.getElementById("login-username").value.trim().toLowerCase();
  const p = document.getElementById("login-password").value.trim();

  // Ambil Data Langsung dari Firebase Cloud
  db.ref("users/" + u).once("value", (snapshot) => {
    if (!snapshot.exists()) {
      alert("Username tidak ditemukan di data desa!");
      return;
    }

    const userData = snapshot.val();

    if (userData.password !== p) {
      alert("Password Anda salah!");
      return;
    }

    if (userData.status === "banned") {
      alert("AKUN DIBLOKIR BENDAHARA! Anda tidak dapat mengakses aplikasi.");
      return;
    }

    // Simpan Sesi Login Sementara di Browser Session
    sessionStorage.setItem("loggedUser", JSON.stringify(userData));

    if (userData.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user-dashboard.html";
    }
  });
}

// ==========================================
// 5. FITUR LUPA / PEMULIHAN PASSWORD
// ==========================================
let tempResetUsername = "";

function verifyUserForReset() {
  const u = document.getElementById("forget-username").value.trim().toLowerCase();
  if (!u) return alert("Masukkan username Anda!");

  db.ref("users/" + u).once("value", (snapshot) => {
    if (!snapshot.exists()) {
      alert("Username tidak ditemukan di database!");
      return;
    }

    const userData = snapshot.val();
    if (userData.role === "admin") {
      alert("Akun Admin tidak bisa dipulihkan dari form ini!");
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

      // Verifikasi Jawaban Ibu Kandung
      if (userData.mother === ansMother) {
        // Update Password di Firebase Cloud
        db.ref("users/" + tempResetUsername).update({
          password: newPass
        }, (error) => {
          if (!error) {
            alert("Password Berhasil Diubah! Silakan login dengan password baru Anda.");
            location.reload();
          } else {
            alert("Gagal mengupdate password: " + error.message);
          }
        });
      } else {
        alert("Jawaban verifikasi nama ibu kandung SALAH!");
      }
    }
  });
}

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
