// ==========================================
// KREDENSIAL UTAMA BENDAHARA / ADMIN
// ==========================================
const ADMIN_USER = "RhyoTama";
const ADMIN_PASS = "SatrioIsna123!";

// ==========================================
// 1. AUTO CHECK SESI LOGIN ADMIN
// ==========================================
(function checkExistingAdminSession() {
  const session = JSON.parse(sessionStorage.getItem("loggedUser"));
  if (session && session.role === "admin") {
    window.location.href = "admin.html";
  }
})();

// ==========================================
// 2. TOGGLE PASSWORD SHOW / HIDE
// ==========================================
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

// ==========================================
// 3. LOGIKA LOGIN ADMIN & REDIRECT
// ==========================================
function handleAdminLogin(e) {
  if (e) e.preventDefault();

  const inputUser = document.getElementById("admin-username").value.trim();
  const inputPass = document.getElementById("admin-password").value.trim();

  // Pencocokan Kredensial Presisi (Case-Sensitive)
  if (inputUser === ADMIN_USER && inputPass === ADMIN_PASS) {
    const adminSession = {
      username: ADMIN_USER,
      role: "admin",
      loginTime: new Date().getTime()
    };

    // Simpan Sesi Login di Browser
    sessionStorage.setItem("loggedUser", JSON.stringify(adminSession));

    // Langsung Redirect ke Dashboard Admin
    window.location.href = "admin.html";
  } else {
    alert("AKSES DITOLAK!\nUsername atau Password Admin salah.");
  }
}

// Fallback Event Listener jika onsubmit di HTML tidak terpanggil
document.addEventListener("DOMContentLoaded", function () {
  const formAdmin = document.getElementById("form-admin-login");
  if (formAdmin) {
    formAdmin.addEventListener("submit", handleAdminLogin);
  }
});
