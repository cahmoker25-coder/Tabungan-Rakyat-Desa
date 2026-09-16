import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, set, get, child, push, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0FTr6qvYEHNqgRSkYLmX0gkR1eB8JVPI",
  authDomain: "slotsilit-cb192.firebaseapp.com",
  databaseURL: "https://slotsilit-cb192-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "slotsilit-cb192",
  storageBucket: "slotsilit-cb192.firebasestorage.app",
  messagingSenderId: "515293089497",
  appId: "1:515293089497:web:5a590bc8faafbbaf91f8c8"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const gamesRef = ref(db, 'games');

let allGames = [];
let currentCategory = 'All';
let currentUser = null;
let userBalance = 0;
let allPaymentMethods = [];
let selectedPaymentMethod = null;

// === HELPER: Parse currency (hapus titik dulu) ===
function parseCurrencyInput(value) {
    if (!value) return 0;
    return parseInt(String(value).replace(/\./g, '')) || 0;
}

// === Authentication Logic ===
window.switchModal = function (closeId, openId) {
    document.getElementById(closeId).classList.add('hidden');
    document.getElementById(openId).classList.remove('hidden');
}

window.checkUsername = function (username) {
    const msg = document.getElementById('usernameMessage');
    const btn = document.querySelector('#registerModal button[type="submit"]');
    username = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    document.getElementById('regUsername').value = username;

    if (username.length < 3) {
        msg.innerText = 'Minimal 3 karakter';
        msg.className = 'text-xs mt-1 text-red-500 min-h-[1.25rem]';
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        return;
    }

    get(child(ref(db), `usernames/${username}`)).then((snapshot) => {
        if (snapshot.exists()) {
            msg.innerText = 'Username sudah dipakai!';
            msg.className = 'text-xs mt-1 text-red-500 min-h-[1.25rem]';
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            msg.innerText = 'Username tersedia!';
            msg.className = 'text-xs mt-1 text-green-500 min-h-[1.25rem]';
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }).catch(err => {
        console.error("Check username failed", err);
        msg.innerText = "Gagal memproses username (" + err.message + ")";
        msg.className = 'text-xs mt-1 text-red-500 min-h-[1.25rem]';
        btn.disabled = false;
    });
}

window.handleMobileMenu = function (type) {
    if (type === 'promo') {
        window.location.href = 'promo.html';
        return;
    }
    if (!currentUser) {
        document.getElementById('loginModal').classList.remove('hidden');
        showNotification('Silakan login terlebih dahulu', 'error');
        return;
    }
    if (type === 'wallet') {
        document.getElementById('walletModal').classList.remove('hidden');
    } else if (type === 'account') {
        document.getElementById('profileModal').classList.remove('hidden');
    }
}

window.handleUserLogin = function (e) {
    e.preventDefault();
    const email = document.getElementById('userLoginEmail').value;
    const password = document.getElementById('userLoginPassword').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            document.getElementById('loginModal').classList.add('hidden');
        })
        .catch((error) => {
            alert("Login Gagal: " + error.message);
        });
}

window.handleUserRegister = function (e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const username = document.getElementById('regUsername').value;
    const referral = document.getElementById('regReferral').value;

    if (!username || username.length < 3) {
        alert('Username tidak valid');
        return;
    }

    get(child(ref(db), `usernames/${username}`)).then((snap) => {
        if (snap.exists()) {
            alert('Username sudah diambil orang lain. Silakan pilih yang lain.');
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                const updates = {};
                updates[`users/${user.uid}`] = {
                    email: email,
                    username: username,
                    balance: 0,
                    referral_code: referral || generateReferralCode(),
                    created_at: Date.now()
                };
                updates[`usernames/${username}`] = user.uid;

                update(ref(db), updates).then(() => {
                    alert("Registrasi Berhasil! Selamat Datang, " + username);
                    document.getElementById('registerModal').classList.add('hidden');
                });
            })
            .catch((error) => {
                alert("Registrasi Gagal: " + error.message);
            });
    }).catch((error) => {
        console.error("Username check failed:", error);
        alert("Gagal mengecek username (Masalah Koneksi/Izin): " + error.message);
    });
}

function generateReferralCode() {
    return 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

window.copyReferral = function () {
    const code = document.getElementById('profileReferral').innerText;
    navigator.clipboard.writeText(code).then(() => alert('Kode referral disalin!'));
}

window.handleUserLogout = function () {
    signOut(auth).then(() => {}).catch((error) => console.error(error));
}

onAuthStateChanged(auth, (user) => {
    const authBtns = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (user) {
        currentUser = user;
        authBtns.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userMenu.classList.add('flex');

        document.getElementById('userEmailDisplay').innerText = user.email.split('@')[0];
        document.getElementById('profileEmail').innerText = user.email;

        onValue(ref(db, 'users/' + user.uid), (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                if (userData.status === 'banned') {
                    signOut(auth).then(() => {
                        showNotification('AKUN ANDA DIBANNED! Hubungi Admin.', 'error');
                        setTimeout(() => location.reload(), 2000);
                    });
                    return;
                }

                if (!userData.referral_code) {
                    const newRef = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
                    update(ref(db, `users/${user.uid}`), { referral_code: newRef });
                    userData.referral_code = newRef;
                }

                userBalance = userData.balance || 0;
                const formatted = userBalance.toLocaleString('id-ID');

                document.getElementById('userBalanceDisplay').innerText = formatted;
                document.getElementById('userEmailDisplay').innerText = userData.username || user.email.split('@')[0];

                if (document.getElementById('walletBalanceDisplay')) {
                    document.getElementById('walletBalanceDisplay').innerText = formatted;
                }

                if (document.getElementById('profileUsername')) {
                    document.getElementById('profileUsername').innerText = userData.username || 'User';
                    document.getElementById('profileEmail').innerText = user.email;
                    document.getElementById('profileBalance').innerText = formatted;
                    document.getElementById('profileReferral').innerText = userData.referral_code || '-';
                    if (userData.created_at) {
                        document.getElementById('profileJoined').innerText = new Date(userData.created_at).toLocaleDateString();
                    } else {
                        document.getElementById('profileJoined').innerText = '-';
                    }
                }
            }
        });

        initPendingDepositsListener();
    } else {
        currentUser = null;
        userBalance = 0;
        authBtns.classList.remove('hidden');
        userMenu.classList.add('hidden');
        userMenu.classList.remove('flex');
    }
});

// === GAME GRID ===
const grid = document.getElementById('gameGrid');

function renderGames(gamesList) {
    if (!grid) return;
    grid.innerHTML = '';

    if (gamesList.length > 0) {
        gamesList.forEach(game => {
            const card = document.createElement('div');
            let hoverClass = "hover:border-brand-cyan hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]";
            let textClass = "group-hover:text-brand-cyan";

            if (game.category === 'Slots') {
                hoverClass = "hover:border-brand-gold hover:shadow-[0_0_20px_rgba(255,215,0,0.4)]";
                textClass = "group-hover:text-brand-gold";
            } else if (game.category === 'Arcade') {
                hoverClass = "hover:border-brand-purple hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]";
                textClass = "group-hover:text-brand-purple";
            } else if (game.category === 'Live') {
                hoverClass = "hover:border-brand-purple hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]";
            }

            card.className = `group relative aspect-[3/4] bg-dark-800 rounded-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 border border-dark-700 ${hoverClass}`;

            card.innerHTML = `
                <img src="${game.image}" alt="${game.name}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x600?text=Game'">
                <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-brand-gold/50 flex items-center gap-1 z-10">
                    <div class="w-2 h-2 rounded-full ${parseInt(game.rtp) > 95 ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-yellow-500'}"></div>
                    <span class="text-[10px] font-bold ${parseInt(game.rtp) > 95 ? 'text-green-400' : 'text-brand-gold'}">RTP ${game.rtp || 90}%</span>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                <div class="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                    <h3 class="text-lg font-bold leading-tight ${textClass} transition-colors">${game.name}</h3>
                    <p class="text-xs text-gray-400 mt-1">${game.provider}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                if (!currentUser) {
                    document.getElementById('loginModal').classList.remove('hidden');
                    return;
                }
                if (userBalance <= 0) {
                    alert('Saldo Anda 0 rupiah. Silakan deposit untuk bermain!');
                    return;
                }
                if (game.url) window.open(game.url, '_blank');
            });

            grid.appendChild(card);
        });
    } else {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12 flex flex-col items-center"><svg class="w-12 h-12 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p>Ooops, belum ada game di kategori ini!</p></div>';
    }
}

function filterAndRender() {
    const searchTerm = document.getElementById('gameSearch').value.toLowerCase();
    let filtered = allGames;

    if (currentCategory !== 'All') {
        filtered = filtered.filter(game => game.category === currentCategory);
    }
    if (searchTerm) {
        filtered = filtered.filter(game => game.name.toLowerCase().includes(searchTerm) || game.provider.toLowerCase().includes(searchTerm));
    }
    renderGames(filtered);
}

window.filterGames = function (category) {
    currentCategory = category;
    const title = category === 'All' ? 'HOT GAMES' : category.toUpperCase() + ' GAMES';
    document.getElementById('section-title').innerText = title;

    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('text-brand-gold', 'text-white');
        el.classList.add('text-gray-400');
    });

    let activeId = 'nav-all';
    if (category === 'Slots') activeId = 'nav-slots';
    else if (category === 'Arcade') activeId = 'nav-arcade';
    else if (category === 'Live') activeId = 'nav-live';
    else if (category === 'Sports') activeId = 'nav-sports';

    const activeEl = document.getElementById(activeId);
    if (activeEl) {
        activeEl.classList.remove('text-gray-400');
        activeEl.classList.add('text-brand-gold', 'font-bold');
    }

    filterAndRender();
}

document.getElementById('gameSearch').addEventListener('input', filterAndRender);

onValue(gamesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allGames = Object.values(data).reverse();
        renderGames(allGames);
    } else {
        allGames = [];
        renderGames([]);
    }
});

// === TOAST ===
window.showNotification = function (message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '';
    if (type === 'success') icon = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    else if (type === 'error') icon = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    else icon = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

window.alert = function (msg) {
    showNotification(msg, 'info');
}

// === JACKPOT ===
const jackpotElement = document.getElementById('jackpot-counter');
if (jackpotElement) {
    let currentJackpot = 8245392100;
    setInterval(() => {
        currentJackpot += Math.floor(Math.random() * 500000);
        jackpotElement.innerText = 'IDR ' + currentJackpot.toLocaleString('id-ID');
    }, 100);
}

// === UTILS ===
function formatCurrency(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Auto-format Inputs
document.querySelectorAll('input[type="number"]').forEach(input => {
    if (input.id.includes('Amount') || input.id.includes('Balance')) {
        input.type = 'text';
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val ? formatCurrency(val) : '';
        });
    }
});

// === GLOBAL NOTIFICATIONS ===
onValue(ref(db, 'notifications/global'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        const notifications = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
        if (notifications.length > 0) {
            const latest = notifications[0];
            const now = Date.now();
            if (now - latest.timestamp < 60000) {
                showNotification(`📢 ADMIN: ${latest.message}`, 'info');
            }
        }
    }
});

// === WALLET LOGIC ===
let currentTransferDirection = 'to-provider';

window.switchWalletTab = function (tab) {
    const views = ['deposit', 'withdraw', 'transfer'];
    views.forEach(v => {
        const view = document.getElementById(`view-${v}`);
        const tabEl = document.getElementById(`tab-${v}`);
        if (view) view.classList.add('hidden');
        if (tabEl) {
            tabEl.classList.remove('border-brand-gold', 'text-brand-gold', 'font-bold');
            tabEl.classList.add('border-transparent', 'text-gray-400');
        }
    });

    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) targetView.classList.remove('hidden');

    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) {
        activeTab.classList.remove('border-transparent', 'text-gray-400');
        activeTab.classList.add('border-brand-gold', 'text-brand-gold', 'font-bold');
    }

    if (tab === 'transfer') {
        updateTransferBalances();
    }
}

window.setTransferDirection = function (direction) {
    currentTransferDirection = direction;

    const toProviderBtn = document.getElementById('btn-to-provider');
    const toMainBtn = document.getElementById('btn-to-main');

    if (direction === 'to-provider') {
        toProviderBtn.classList.add('border-brand-cyan', 'bg-brand-cyan/10', 'text-brand-cyan');
        toProviderBtn.classList.remove('border-dark-600', 'bg-dark-900', 'text-gray-400');
        toMainBtn.classList.remove('border-brand-gold', 'bg-brand-gold/10', 'text-brand-gold');
        toMainBtn.classList.add('border-dark-600', 'bg-dark-900', 'text-gray-400');
    } else {
        toMainBtn.classList.add('border-brand-gold', 'bg-brand-gold/10', 'text-brand-gold');
        toMainBtn.classList.remove('border-dark-600', 'bg-dark-900', 'text-gray-400');
        toProviderBtn.classList.remove('border-brand-cyan', 'bg-brand-cyan/10', 'text-brand-cyan');
        toProviderBtn.classList.add('border-dark-600', 'bg-dark-900', 'text-gray-400');
    }
}

function updateTransferBalances() {
    const mainEl = document.getElementById('mainWalletBalance');
    const providerEl = document.getElementById('providerBalance');

    if (mainEl) mainEl.textContent = userBalance.toLocaleString('id-ID');

    if (currentUser) {
        get(ref(db, `users/${currentUser.uid}/provider_balance`)).then(snap => {
            const provBalance = snap.val() || 0;
            if (providerEl) providerEl.textContent = provBalance.toLocaleString('id-ID');
        });
    }
}

// === TRANSFER PROVIDER (FIXED) ===
window.handleProviderTransfer = function () {
    if (!currentUser) return showNotification('Silakan login terlebih dahulu', 'error');

    const amount = parseCurrencyInput(document.getElementById('transferAmount').value);
    const provider = document.getElementById('gameProviderSelect').value;

    if (amount < 10000) return showNotification('Minimal transfer IDR 10.000', 'error');
    if (amount > userBalance && currentTransferDirection === 'to-provider') {
        return showNotification('Saldo dompet utama tidak mencukupi', 'error');
    }

    if (currentTransferDirection === 'to-provider') {
        if (amount > userBalance) return showNotification('Saldo dompet utama tidak mencukupi', 'error');

        get(ref(db, `users/${currentUser.uid}`)).then(snap => {
            const userData = snap.val();
            const currentBalance = userData?.balance || 0;
            const currentProviderBalance = userData?.provider_balance || 0;

            update(ref(db, `users/${currentUser.uid}`), {
                balance: currentBalance - amount,
                provider_balance: currentProviderBalance + amount
            }).then(() => {
                showNotification(`✅ Transfer ke ${provider} berhasil! IDR ${amount.toLocaleString('id-ID')}`, 'success');
                document.getElementById('transferAmount').value = '';
                updateTransferBalances();
            });
        });
    } else {
        get(ref(db, `users/${currentUser.uid}/provider_balance`)).then(snap => {
            const providerBalance = snap.val() || 0;
            if (amount > providerBalance) return showNotification('Saldo provider tidak mencukupi', 'error');

            get(ref(db, `users/${currentUser.uid}/balance`)).then(balSnap => {
                const currentBalance = balSnap.val() || 0;

                update(ref(db, `users/${currentUser.uid}`), {
                    balance: currentBalance + amount,
                    provider_balance: providerBalance - amount
                }).then(() => {
                    showNotification(`✅ Transfer ke dompet utama berhasil! IDR ${amount.toLocaleString('id-ID')}`, 'success');
                    document.getElementById('transferAmount').value = '';
                    updateTransferBalances();
                });
            });
        });
    }
}

// === PAYMENT METHODS ===
const paymentsRef = ref(db, 'payment_methods');
let pendingDepositData = null;

onValue(paymentsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allPaymentMethods = Object.entries(data).map(([key, val]) => ({ key, ...val }));
        renderPaymentDropdown();
    } else {
        allPaymentMethods = [];
        renderPaymentDropdown();
    }
});

function renderPaymentDropdown() {
    const select = document.getElementById('paymentMethodSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Metode --</option>';
    allPaymentMethods.forEach(pay => {
        const typeLabel = pay.type === 'ewallet' ? '🔲 QRIS' : '🏦 BANK';
        const option = document.createElement('option');
        option.value = pay.key;
        option.textContent = `${typeLabel} - ${pay.name}`;
        select.appendChild(option);
    });
}

window.setDepoAmount = function (amount) {
    const input = document.getElementById('depoAmount');
    if (input) {
        input.value = formatCurrency(amount);
    }
}

window.showPaymentInfo = function () {}

// === PROCEED TO PAYMENT (FIXED) ===
window.proceedToPaymentInfo = function () {
    const amountInput = document.getElementById('depoAmount');
    const methodSelect = document.getElementById('paymentMethodSelect');

    const amount = parseCurrencyInput(amountInput.value);
    const methodKey = methodSelect.value;

    if (!amount || amount < 10000) {
        return showNotification('Minimal deposit IDR 10.000', 'error');
    }
    if (!methodKey) {
        return showNotification('Pilih metode pembayaran', 'error');
    }

    const pay = allPaymentMethods.find(p => p.key === methodKey);
    if (!pay) return showNotification('Metode tidak ditemukan', 'error');

    selectedPaymentMethod = pay;

    const uniqueCode = Math.floor(Math.random() * 99) + 1;
    const totalTransfer = amount + uniqueCode;

    pendingDepositData = {
        amount: amount,
        uniqueCode: uniqueCode,
        totalTransfer: totalTransfer,
        method: pay
    };

    document.getElementById('transferAmountDisplay').textContent = 'IDR ' + totalTransfer.toLocaleString('id-ID');
    document.getElementById('uniqueCodeInfo').textContent = `Deposit: IDR ${amount.toLocaleString('id-ID')} + Kode Unik: ${uniqueCode}`;

    const bankInfo = document.getElementById('bankInfoDisplay');
    const qrisInfo = document.getElementById('qrisInfoDisplay');
    bankInfo.classList.add('hidden');
    qrisInfo.classList.add('hidden');

    if (pay.type === 'ewallet') {
        document.getElementById('selectedQrisName').textContent = pay.name;
        document.getElementById('selectedQrisImage').src = pay.image;
        qrisInfo.classList.remove('hidden');
    } else {
        document.getElementById('selectedBankName').textContent = pay.name;
        document.getElementById('selectedBankNumber').textContent = pay.number;
        document.getElementById('selectedBankHolder').textContent = pay.holder;
        bankInfo.classList.remove('hidden');
    }

    document.getElementById('deposit-step-1').classList.add('hidden');
    document.getElementById('deposit-step-2').classList.remove('hidden');
}

window.backToStep1 = function () {
    document.getElementById('deposit-step-1').classList.remove('hidden');
    document.getElementById('deposit-step-2').classList.add('hidden');
    pendingDepositData = null;
}

window.copyToClipboard = function (elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        navigator.clipboard.writeText(el.textContent).then(() => {
            showNotification('Disalin ke clipboard!', 'success');
        });
    }
}

window.downloadQris = function () {
    const imgSrc = document.getElementById('selectedQrisImage')?.src;
    if (imgSrc) {
        const link = document.createElement('a');
        link.href = imgSrc;
        link.download = 'qris-payment.png';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Mengunduh QR Code...', 'info');
    }
}

window.confirmPayment = function () {
    if (!currentUser) return showNotification('Silakan login terlebih dahulu', 'error');
    if (!pendingDepositData) return showNotification('Data deposit tidak valid', 'error');

    const { amount, uniqueCode, totalTransfer, method } = pendingDepositData;

    let transferInfo = '';
    if (method.type === 'ewallet') {
        transferInfo = `Scan QRIS ${method.name}`;
    } else {
        transferInfo = `${method.name} ${method.number} a.n ${method.holder}`;
    }

    const transRef = push(ref(db, 'transactions'));
    set(transRef, {
        userId: currentUser.uid,
        type: 'deposit',
        amount: amount,
        uniqueCode: uniqueCode,
        totalTransfer: totalTransfer,
        method: method.name,
        methodType: method.type,
        methodDetails: transferInfo,
        status: 'pending',
        timestamp: Date.now()
    }).then(() => {
        showNotification(`✅ Deposit dikonfirmasi! Menunggu verifikasi admin (maks 5 menit).`, 'success');
        document.getElementById('walletModal').classList.add('hidden');

        document.getElementById('depoAmount').value = '';
        document.getElementById('paymentMethodSelect').value = '';
        backToStep1();
        pendingDepositData = null;
        selectedPaymentMethod = null;

        setTimeout(() => {
            const panel = document.getElementById('notificationPanel');
            if (panel) panel.classList.remove('hidden');
        }, 500);
    }).catch(err => {
        showNotification('Gagal membuat permintaan: ' + err.message, 'error');
        console.error(err);
    });
}

window.selectPaymentMethod = function (key) {
    const pay = allPaymentMethods.find(p => p.key === key);
    if (pay) {
        selectedPaymentMethod = pay;
    }
}

// === TRANSACTION SUBMIT (FIXED) ===
window.handleTransactionSubmit = function (type) {
    if (!currentUser) return showNotification('Silakan login terlebih dahulu', 'error');

    let amount = 0;

    if (type === 'deposit') {
        const input = document.getElementById('depoAmount');
        amount = parseCurrencyInput(input.value);

        if (!selectedPaymentMethod) return showNotification('Pilih metode pembayaran terlebih dahulu', 'error');
        if (!amount || amount < 10000) return showNotification('Minimal deposit IDR 10.000', 'error');

        const uniqueCode = Math.floor(Math.random() * 99) + 1;
        const totalTransfer = amount + uniqueCode;

        let transferInfo = '';
        if (selectedPaymentMethod.type === 'ewallet') {
            transferInfo = `Scan QRIS ${selectedPaymentMethod.name}`;
        } else {
            transferInfo = `${selectedPaymentMethod.name} ${selectedPaymentMethod.number} a.n ${selectedPaymentMethod.holder}`;
        }

        const transRef = push(ref(db, 'transactions'));
        set(transRef, {
            userId: currentUser.uid,
            type: 'deposit',
            amount: amount,
            uniqueCode: uniqueCode,
            totalTransfer: totalTransfer,
            method: selectedPaymentMethod.name,
            methodType: selectedPaymentMethod.type,
            methodDetails: transferInfo,
            status: 'pending',
            timestamp: Date.now()
        }).then(() => {
            showNotification(`💰 Deposit berhasil dibuat! Transfer TEPAT IDR ${totalTransfer.toLocaleString('id-ID')} ke ${transferInfo}. Tunggu verifikasi admin (estimasi 5 menit).`, 'success');
            document.getElementById('walletModal').classList.add('hidden');
            input.value = '';
            selectedPaymentMethod = null;

            setTimeout(() => {
                const panel = document.getElementById('notificationPanel');
                if (panel) panel.classList.remove('hidden');
            }, 500);
        }).catch(err => {
            showNotification('Gagal membuat permintaan: ' + err.message, 'error');
            console.error(err);
        });

    } else if (type === 'withdraw') {
        const input = document.getElementById('wdAmount');
        const methodInput = document.getElementById('wdMethod');
        amount = parseCurrencyInput(input.value);
        const note = methodInput.value;

        if (!amount || amount < 50000) return showNotification('Minimal withdraw IDR 50.000', 'error');
        if (amount > userBalance) return showNotification('Saldo tidak mencukupi', 'error');
        if (!note) return showNotification('Mohon isi info rekening tujuan', 'error');

        const transRef = push(ref(db, 'transactions'));
        set(transRef, {
            userId: currentUser.uid,
            type: 'withdraw',
            amount: amount,
            method: 'Withdraw Request',
            note: note,
            status: 'pending',
            timestamp: Date.now()
        }).then(() => {
            showNotification('Permintaan withdraw berhasil dikirim', 'success');
            document.getElementById('walletModal').classList.add('hidden');
            input.value = '';
            methodInput.value = '';
        }).catch(err => {
            showNotification('Gagal request WD: ' + err.message, 'error');
        });
    }
}

// === NOTIFICATION BELL ===
let pendingDeposits = [];
let previousPendingCount = 0;
let countdownIntervals = {};

window.toggleNotificationPanel = function () {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

document.addEventListener('click', (e) => {
    const panel = document.getElementById('notificationPanel');
    const bellBtn = document.getElementById('notifBellBtn');
    if (panel && bellBtn && !panel.contains(e.target) && !bellBtn.contains(e.target)) {
        panel.classList.add('hidden');
    }
});

function formatCountdown(ms) {
    if (ms <= 0) return 'Menunggu verifikasi...';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getRemainingTime(timestamp) {
    const elapsed = Date.now() - timestamp;
    const remaining = 300000 - elapsed;
    return Math.max(0, remaining);
}

function renderPendingDeposits() {
    const container = document.getElementById('pendingDepositsList');
    const badge = document.getElementById('notifBadge');

    if (!container || !badge) return;

    const userDeposits = pendingDeposits.filter(d => d.status === 'pending' || d.status === 'expired');

    const pendingCount = pendingDeposits.filter(d => d.status === 'pending').length;
    if (pendingCount > 0) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
        badge.textContent = pendingCount;
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }

    Object.values(countdownIntervals).forEach(clearInterval);
    countdownIntervals = {};

    if (userDeposits.length === 0) {
        container.innerHTML = `
            <div class="p-6 text-center text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4">
                    </path>
                </svg>
                <p class="text-sm">Tidak ada deposit pending</p>
                <p class="text-xs mt-1 text-gray-600">Semua deposit sudah diproses ✓</p>
            </div>
        `;
        return;
    }

    container.innerHTML = userDeposits.map((dep, index) => {
        const remaining = getRemainingTime(dep.timestamp);
        const isExpired = remaining <= 0 && dep.status === 'pending';
        const timeId = `countdown-${dep.key}`;

        if (isExpired && dep.status === 'pending') {
            update(ref(db, `transactions/${dep.key}`), { status: 'expired' });
        }

        const statusDisplay = dep.status === 'expired' || isExpired ? `
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase">GAGAL</span>
        ` : `
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold uppercase">Pending</span>
        `;

        const actionBtn = dep.status === 'expired' || isExpired ? `
            <button onclick="retryDeposit(${dep.amount})" 
                class="mt-2 w-full py-2 bg-brand-gold text-dark-900 text-xs font-bold rounded-lg hover:bg-yellow-500 transition-colors">
                COBA LAGI
            </button>
        ` : `
            <div class="flex items-center gap-2 mt-2">
                <div class="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                    <div id="progress-${dep.key}" class="h-full bg-gradient-to-r from-yellow-500 to-brand-gold transition-all duration-1000" 
                        style="width: ${Math.max(0, (remaining / 300000) * 100)}%"></div>
                </div>
                <span id="${timeId}" class="text-xs text-yellow-400 font-mono font-bold w-12 text-right">
                    ${formatCountdown(remaining)}
                </span>
            </div>
        `;

        const iconDisplay = dep.status === 'expired' || isExpired ? `
            <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </div>
        ` : `
            <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
        `;

        return `
            <div class="p-4 border-b border-dark-700 hover:bg-dark-700/50 transition-colors relative group">
                <button onclick="deleteNotification('${dep.key}')" 
                    class="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus notifikasi">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                
                <div class="flex items-start gap-3">
                    ${iconDisplay}
                    <div class="flex-1 min-w-0 pr-6">
                        <div class="flex justify-between items-start">
                            <p class="text-sm font-medium text-white">Deposit via ${dep.method}</p>
                            ${statusDisplay}
                        </div>
                        <p class="text-lg font-bold text-brand-gold font-mono mt-1">
                            IDR ${(dep.totalTransfer || dep.amount).toLocaleString('id-ID')}
                        </p>
                        <p class="text-xs text-gray-500 mt-1">${dep.methodDetails || ''}</p>
                        ${actionBtn}
                        ${dep.status !== 'expired' && !isExpired ? `
                            <p class="text-[10px] text-gray-500 mt-2">
                                ⏰ Mohon tunggu verifikasi admin. Jangan tutup halaman ini.
                            </p>
                        ` : `
                            <p class="text-[10px] text-red-400 mt-2">
                                ❌ Waktu verifikasi habis. Silakan buat deposit baru.
                            </p>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    userDeposits.filter(d => d.status === 'pending').forEach(dep => {
        const timeEl = document.getElementById(`countdown-${dep.key}`);
        const progressEl = document.getElementById(`progress-${dep.key}`);

        if (timeEl) {
            countdownIntervals[dep.key] = setInterval(() => {
                const remaining = getRemainingTime(dep.timestamp);
                timeEl.textContent = formatCountdown(remaining);

                if (progressEl) {
                    progressEl.style.width = `${Math.max(0, (remaining / 300000) * 100)}%`;
                }

                if (remaining <= 0) {
                    clearInterval(countdownIntervals[dep.key]);
                    update(ref(db, `transactions/${dep.key}`), { status: 'expired' }).then(() => {
                        showNotification('⏰ Waktu deposit habis. Transaksi dibatalkan otomatis.', 'error');
                    });
                }
            }, 1000);
        }
    });
}

window.deleteNotification = function (key) {
    if (confirm('Hapus notifikasi ini?')) {
        remove(ref(db, `transactions/${key}`)).then(() => {
            showNotification('Notifikasi dihapus', 'info');
        }).catch(err => {
            pendingDeposits = pendingDeposits.filter(d => d.key !== key);
            renderPendingDeposits();
        });
    }
}

window.retryDeposit = function (amount) {
    document.getElementById('notificationPanel')?.classList.add('hidden');
    document.getElementById('walletModal')?.classList.remove('hidden');
    document.getElementById('depoAmount').value = amount;
    switchWalletTab('deposit');
}

function initPendingDepositsListener() {
    if (!currentUser) return;

    const transRef = ref(db, 'transactions');
    onValue(transRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const allTransactions = Object.entries(data).map(([key, val]) => ({ key, ...val }));

            const previousPending = pendingDeposits.filter(d => d.status === 'pending');
            pendingDeposits = allTransactions.filter(t =>
                t.userId === currentUser.uid && t.type === 'deposit'
            );

            const currentPending = pendingDeposits.filter(d => d.status === 'pending');

            if (previousPending.length > currentPending.length && previousPending.length > 0) {
                const approvedDeposits = previousPending.filter(prev =>
                    !currentPending.find(curr => curr.key === prev.key)
                );

                approvedDeposits.forEach(dep => {
                    showNotification(`🎉 DEPOSIT BERHASIL! IDR ${dep.amount.toLocaleString('id-ID')} telah masuk ke saldo Anda!`, 'success');
                    triggerDepositSuccessAnimation();
                });
            }

            renderPendingDeposits();
        } else {
            pendingDeposits = [];
            renderPendingDeposits();
        }
    });
}

function triggerDepositSuccessAnimation() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[200] pointer-events-none flex items-center justify-center';
    overlay.innerHTML = `
        <div class="animate-bounce-in bg-green-500/90 backdrop-blur rounded-2xl p-8 shadow-2xl text-center">
            <div class="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
                <svg class="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <h3 class="text-2xl font-bold text-white mb-2">DEPOSIT SUKSES!</h3>
            <p class="text-green-100">Saldo Anda telah diperbarui</p>
        </div>
    `;
    document.body.appendChild(overlay);

    const bellBtn = document.getElementById('notifBellBtn');
    if (bellBtn) {
        bellBtn.classList.add('text-green-400');
        setTimeout(() => bellBtn.classList.remove('text-green-400'), 3000);
    }

    setTimeout(() => {
        overlay.remove();
    }, 3000);
}
