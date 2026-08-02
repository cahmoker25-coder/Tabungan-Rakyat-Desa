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

// --- 4. INIT EVENT LISTENERS (SESUAIKAN DENGAN DOM) ---
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

        sessionStorage.setItem("loggedUser", JSON.stringify(userData));

        if (userData.role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "user-dashboard.html";
        }
      });
    });
  }

  // HANDLE DAFTAR
  const formDaftar = document.getElementById("form-daftar");
  if (formDaftar) {
    formDaftar.addEventListener("submit", function (e) {
      e.preventDefault();

      const fullname = document.getElementById("reg-fullname").value.trim();
      const username = document.getElementById("reg-username").value.trim().toLowerCase();
      const email = document.getElementById("reg-email").value.trim();
      const phone = document.getElementById("reg-phone").value.trim();
      const password = document.getElementById("reg-password").value;
      const confirmPassword = document.getElementById("reg-confirm-password").value;

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

      db.ref("users/" + username).once("value", (snapshot) => {
        if (snapshot.exists()) {
          alert("Username @" + username + " sudah terdaftar! Gunakan username lain.");
        } else {
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
              alert("Pendaftaran Berhasil! Silakan Login.");
              formDaftar.reset();
              switchForm('login');
            }
          });
        }
      });
    });
  }
});

// --- 5. LUPA PASSWORD LOGIC ---
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

      if (userData.mother === ansMother) {
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
