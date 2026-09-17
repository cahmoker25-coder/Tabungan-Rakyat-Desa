// Import Firebase Functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// TODO: Replace with your actual Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR API KEY",
    authDomain: "YOUR AUTH DOMAIN",
    databaseURL: "YOUR DATABASE URL",
    projectId: "YOUR PROJECT ID",
    storageBucket: "YOUR STORAGE BUCKET",
    messagingSenderId: "YOUR MESSAGING SENDER ID",
    appId: "YOUR APP ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const gamesRef = ref(db, 'games');
const paymentsRef = ref(db, 'payment_methods');
const transactionsRef = ref(db, 'transactions');
const usersRef = ref(db, 'users');

let currentGameKey = null; // Store key for editing
let allGames = []; // Store fetched games for search
let allUsers = []; // Store fetched users
let currentUserFilter = 'all'; // User filter state

// Load users from Firebase
onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allUsers = Object.entries(data).map(([uid, userData]) => ({
            uid,
            ...userData
        }));
        // Update stats
        const total = allUsers.length;
        const active = allUsers.filter(u => u.status !== 'banned').length;
        const banned = allUsers.filter(u => u.status === 'banned').length;

        const totalEl = document.getElementById('stat-total-users');
        const activeEl = document.getElementById('stat-active-users');
        const bannedEl = document.getElementById('stat-banned-users');

        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
        if (bannedEl) bannedEl.textContent = banned;

        renderUsers();
    } else {
        allUsers = [];
        renderUsers();
    }
});

// Global Filter Helper
window.filterGames = function (query) {
    if (!query) {
        renderGames(allGames);
        return;
    }
    const lower = query.toLowerCase();
    const filtered = allGames.filter(g => g.data.name.toLowerCase().includes(lower) || g.data.provider.toLowerCase().includes(lower));
    renderGames(filtered);
}

// === TOAST NOTIFICATION SYSTEM ===
window.showNotification = function (message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    let icon = '';
    if (type === 'success') icon = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    else if (type === 'error') icon = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    else icon = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    // Auto remove after 3s
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}
// Override alert
window.alert = function (msg) { showNotification(msg, 'info'); }

// === Authentication Logic ===

window.handleLogin = function (event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const btn = event.target.querySelector('button');

    btn.innerHTML = 'Loading...';
    btn.disabled = true;
    errorDiv.classList.add('hidden');

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            // Observer handles UI
        })
        .catch((error) => {
            errorDiv.textContent = "Login Gagal: " + error.message;
            errorDiv.classList.remove('hidden');
            btn.innerHTML = 'LOGIN';
            btn.disabled = false;
        });
}

window.handleLogout = function () {
    signOut(auth).catch(console.error);
}

const ADMIN_UID = 'agR7FbpgGTR78toySjokHm96NOv2';

onAuthStateChanged(auth, (user) => {
    const loginOverlay = document.getElementById('loginOverlay');
    if (user) {
        if (user.uid !== ADMIN_UID) {
            signOut(auth).then(() => {
                showNotification('AKSES DITOLAK: Anda bukan Admin!', 'error');
                loginOverlay.classList.remove('hidden');
            });
            return;
        }
        loginOverlay.classList.add('hidden');
        initGameListener();
    } else {
        loginOverlay.classList.remove('hidden');
    }
});

// === TAB SWITCHING ===
window.switchAdminTab = function (tabName) {
    document.querySelectorAll('.admin-view').forEach(el => el.classList.add('hidden'));
    const view = document.getElementById(`view-${tabName}`);
    if (view) view.classList.remove('hidden');

    // Update Nav
    const tabs = ['dashboard', 'games', 'payments', 'transactions', 'users', 'settings', 'promo'];
    tabs.forEach(t => {
        const link = document.getElementById(`nav-${t}`);
        if (link) {
            if (t === tabName) {
                link.classList.add('bg-brand-gold/10', 'text-brand-gold', 'border-r-4', 'border-brand-gold', 'font-bold');
                link.classList.remove('text-gray-400');
            } else {
                link.classList.remove('bg-brand-gold/10', 'text-brand-gold', 'border-r-4', 'border-brand-gold', 'font-bold');
                link.classList.add('text-gray-400');
            }
        }
    });
}

// === GAME MANAGEMENT ===

// === DASHBOARD STATS ===
function updateDashboardStats() {
    // 1. Transactions (Depo/WD)
    onValue(transactionsRef, (snapshot) => {
        const data = snapshot.val();
        let totalDepo = 0;
        let totalWd = 0;
        if (data) {
            Object.values(data).forEach(t => {
                const amount = parseInt(t.amount) || 0;
                if (t.status === 'approved') { // Only approved? Or all? Usually approved.
                    if (t.type === 'deposit') totalDepo += amount;
                    else if (t.type === 'withdraw') totalWd += amount;
                }
            });
        }
        const elDepo = document.getElementById('dash-depo');
        const elWd = document.getElementById('dash-wd');
        if (elDepo) elDepo.innerText = 'IDR ' + totalDepo.toLocaleString('id-ID');
        if (elWd) elWd.innerText = 'IDR ' + totalWd.toLocaleString('id-ID');
    });

    // 2. Games
    const elGames = document.getElementById('dash-games');
    if (elGames) elGames.innerText = allGames.length;

    // 3. Users
    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        let total = 0;
        let active = 0;
        if (data) {
            const users = Object.values(data);
            total = users.length;
            active = users.filter(u => u.status !== 'banned').length;
        }
        const elUsers = document.getElementById('dash-users');
        const elActive = document.getElementById('dash-active');
        if (elUsers) elUsers.innerText = total;
        if (elActive) elActive.innerText = active;
    });
}

// === GAME MANAGEMENT ===

function initGameListener() {
    onValue(gamesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allGames = Object.entries(data).reverse().map(([key, data]) => ({ key, data }));

            // Note: Stats removed from here and moved to Dashboard View
            updateDashboardStats(); // Update dashboard whenever games change too

            renderGames(allGames);
        } else {
            allGames = [];
            renderGames([]);
            updateDashboardStats();
        }
    });
}

window.openModal = function () { document.getElementById('addGameModal').classList.remove('hidden'); }
window.closeModal = function () {
    document.getElementById('addGameModal').classList.add('hidden');
    document.getElementById('addGameForm').reset();
    currentGameKey = null;
    document.querySelector('#addGameModal h3').innerText = 'Tambah Game Baru';
}

window.handleGameSubmit = function (event) {
    event.preventDefault();
    const gameData = {
        name: document.getElementById('gameName').value,
        provider: document.getElementById('gameProvider').value,
        category: document.getElementById('gameCategory').value,
        image: document.getElementById('gameImage').value,
        url: document.getElementById('gameUrl').value,
        rtp: document.getElementById('gameRTP').value,
        status: 'Active',
        updatedAt: Date.now()
    };

    if (currentGameKey) {
        update(ref(db, `games/${currentGameKey}`), gameData)
            .then(() => { showNotification('Game diupdate', 'success'); window.closeModal(); });
    } else {
        gameData.createdAt = Date.now();
        push(gamesRef, gameData)
            .then(() => { showNotification('Game ditambah', 'success'); window.closeModal(); });
    }
}

window.editGame = function (key) {
    const entry = allGames.find(e => e.key === key);
    if (!entry) return;
    currentGameKey = key;
    const g = entry.data;
    document.getElementById('gameName').value = g.name;
    document.getElementById('gameProvider').value = g.provider;
    document.getElementById('gameCategory').value = g.category;
    document.getElementById('gameImage').value = g.image;
    document.getElementById('gameUrl').value = g.url;
    document.getElementById('gameRTP').value = g.rtp || 90; // Default if missing
    document.querySelector('#addGameModal h3').innerText = 'Edit Game';
    window.openModal();
}

window.deleteGame = function (key) {
    if (confirm('Hapus game?')) remove(ref(db, `games/${key}`));
}

function renderGames(list) {
    const tbody = document.getElementById('gameTableBody');
    if (!tbody) return;
    tbody.innerHTML = list.map(({ key, data }) => `
        <tr class="hover:bg-dark-700/30 border-b border-dark-700">
            <td class="p-4 flex gap-3 items-center">
                <img src="${data.image}" class="w-10 h-10 rounded object-cover">
                <div><p class="font-bold">${data.name}</p><small class="text-xs text-brand-cyan">${data.url}</small></div>
            </td>
            <td class="p-4 text-gray-300">${data.provider}</td>
            <td class="p-4 text-xs text-brand-gold">${data.category}</td>
            <td class="p-4 font-mono font-bold ${parseInt(data.rtp) > 95 ? 'text-green-400' : 'text-yellow-400'}">${data.rtp || 90}%</td>
            <td class="p-4 text-right">
                <button onclick="editGame('${key}')" class="text-brand-cyan mr-2">Edit</button>
                <button onclick="deleteGame('${key}')" class="text-red-500">Del</button>
            </td>
        </tr>
    `).join('');
    document.getElementById('gameCountInfo').innerText = `Total: ${list.length}`;
}

// === PAYMENT METHODS ===

window.openPaymentModal = () => {
    document.getElementById('paymentModal').classList.remove('hidden');
    togglePaymentFields(); // Init state
}
window.closePaymentModal = () => document.getElementById('paymentModal').classList.add('hidden');

// Dynamic Fields based on Type
document.getElementById('payType').addEventListener('change', togglePaymentFields);

function togglePaymentFields() {
    const type = document.getElementById('payType').value;
    const numberContainer = document.getElementById('payNumberContainer');
    const holderContainer = document.getElementById('payHolderContainer');
    const qrContainer = document.getElementById('payImageContainer');

    if (type === 'ewallet') {
        // QRIS Mode: Hide Number & Holder
        numberContainer.classList.add('hidden');
        document.getElementById('payNumber').removeAttribute('required');

        holderContainer.classList.add('hidden');
        document.getElementById('payHolder').removeAttribute('required');

        qrContainer.classList.remove('hidden');
        document.getElementById('payImage').setAttribute('required', 'true');
    } else {
        // Bank Mode
        numberContainer.classList.remove('hidden');
        document.getElementById('payNumber').setAttribute('required', 'true');

        holderContainer.classList.remove('hidden');
        document.getElementById('payHolder').setAttribute('required', 'true');

        qrContainer.classList.add('hidden');
        document.getElementById('payImage').removeAttribute('required');
    }
}

window.handlePaymentSubmit = function (e) {
    e.preventDefault();
    const type = document.getElementById('payType').value;

    const data = {
        name: document.getElementById('payName').value,
        type: type,
        active: true,
        createdAt: Date.now()
    };

    if (type === 'ewallet') {
        data.image = document.getElementById('payImage').value;
        data.number = '-'; // Placeholder
        data.holder = 'QRIS'; // Placeholder
    } else {
        data.number = document.getElementById('payNumber').value;
        data.holder = document.getElementById('payHolder').value;
    }

    push(paymentsRef, data).then(() => {
        showNotification('Metode ditambah', 'success');
        window.closePaymentModal();
        e.target.reset();
        togglePaymentFields(); // Reset UI
    });
}
window.deletePayment = function (key) {
    if (confirm('Hapus metode?')) remove(ref(db, `payment_methods/${key}`));
}

onValue(paymentsRef, (snapshot) => {
    const grid = document.getElementById('paymentMethodsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const data = snapshot.val();
    if (data) {
        Object.entries(data).forEach(([key, pay]) => {
            const el = document.createElement('div');
            el.className = 'bg-dark-700 p-4 rounded border border-dark-600 relative flex flex-col gap-2'; // Added flex

            let details = '';
            if (pay.type === 'ewallet') {
                details = `
                    <div class="w-full aspect-square bg-white p-2 rounded flex items-center justify-center mb-2">
                         <img src="${pay.image}" class="max-w-full max-h-full object-contain" alt="QRIS">
                    </div>
                `;
            } else {
                details = `
                     <p class="text-sm text-gray-400 font-mono tracking-wider">${pay.number}</p>
                     <p class="text-xs text-brand-cyan uppercase">${pay.holder}</p>
                `;
            }

            el.innerHTML = `
                <button onclick="deletePayment('${key}')" class="absolute top-2 right-2 text-red-500 hover:text-red-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] uppercase bg-dark-800 px-2 py-0.5 rounded border border-dark-600 ${pay.type === 'ewallet' ? 'text-brand-gold' : 'text-blue-400'}">${pay.type === 'ewallet' ? 'QRIS' : 'BANK'}</span>
                    <h4 class="font-bold text-white truncate">${pay.name}</h4>
                </div>
                ${details}
            `;
            grid.appendChild(el);
        });
    }
});

// === TRANSACTION VERIFICATION ===
let allTransactions = [];
let currentTypeFilter = 'all';
let currentStatusFilter = 'pending';

// Transaction search listener
const transSearchEl = document.getElementById('transactionSearch');
if (transSearchEl) {
    transSearchEl.addEventListener('input', renderTransactions);
}

window.filterTransactions = function (filterType, value) {
    if (filterType === 'type') {
        currentTypeFilter = value;
        // Update button styles
        document.querySelectorAll('.trans-type-filter').forEach(btn => {
            if (btn.dataset.typeFilter === value) {
                btn.classList.add('bg-dark-700', 'text-white');
                btn.classList.remove('bg-dark-900', 'text-gray-400');
            } else {
                btn.classList.remove('bg-dark-700', 'text-white');
                btn.classList.add('bg-dark-900', 'text-gray-400');
            }
        });
    } else if (filterType === 'status') {
        currentStatusFilter = value;
        // Update button styles
        document.querySelectorAll('.trans-status-filter').forEach(btn => {
            const isActive = btn.dataset.statusFilter === value;
            btn.classList.remove('bg-yellow-500/20', 'text-yellow-400', 'border-yellow-500/30',
                'bg-green-500/20', 'text-green-500', 'border-green-500/30',
                'bg-red-500/20', 'text-red-500', 'border-red-500/30',
                'bg-dark-900', 'text-gray-400');

            if (isActive) {
                if (value === 'pending') btn.classList.add('bg-yellow-500/20', 'text-yellow-400', 'border-yellow-500/30');
                else if (value === 'approved') btn.classList.add('bg-green-500/20', 'text-green-500', 'border-green-500/30');
                else if (value === 'rejected' || value === 'expired') btn.classList.add('bg-red-500/20', 'text-red-500', 'border-red-500/30');
                else btn.classList.add('bg-dark-700', 'text-white');
            } else {
                btn.classList.add('bg-dark-900', 'text-gray-400');
            }
        });
    }
    renderTransactions();
}

function updateTransactionStats() {
    let pendingCount = 0;
    let totalDeposit = 0;
    let totalWithdraw = 0;

    allTransactions.forEach(t => {
        if (t.status === 'pending') pendingCount++;
        if (t.status === 'approved') {
            const amount = parseInt(t.amount) || 0;
            if (t.type === 'deposit') totalDeposit += amount;
            else if (t.type === 'withdraw') totalWithdraw += amount;
        }
    });

    const elPending = document.getElementById('trans-pending-count');
    const elDepo = document.getElementById('trans-deposit-total');
    const elWd = document.getElementById('trans-withdraw-total');
    const elNet = document.getElementById('trans-net-profit');

    if (elPending) elPending.innerText = pendingCount;
    if (elDepo) elDepo.innerText = 'IDR ' + totalDeposit.toLocaleString('id-ID');
    if (elWd) elWd.innerText = 'IDR ' + totalWithdraw.toLocaleString('id-ID');
    if (elNet) elNet.innerText = 'IDR ' + (totalDeposit - totalWithdraw).toLocaleString('id-ID');
}

function renderTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;

    let filtered = allTransactions;

    // Filter by type
    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === currentTypeFilter);
    }

    // Filter by status
    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === currentStatusFilter);
    }

    // Filter by search
    const searchVal = document.getElementById('transactionSearch')?.value.toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(t => t.userId.toLowerCase().includes(searchVal));
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    tbody.innerHTML = filtered.map(t => {
        const statusClass = {
            'pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            'approved': 'bg-green-500/10 text-green-500 border-green-500/20',
            'rejected': 'bg-red-500/10 text-red-400 border-red-500/20',
            'expired': 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }[t.status] || 'bg-gray-500/10 text-gray-400';

        const actionBtns = t.status === 'pending' ? `
            <button onclick="processTransaction('${t.key}', '${t.userId}', ${t.amount}, '${t.type}', 'approve')" 
                class="text-green-500 mr-2 border border-green-500 px-2 py-1 rounded hover:bg-green-500/10 text-xs font-bold">
                ✓ APPROVE
            </button>
            <button onclick="processTransaction('${t.key}', '${t.userId}', ${t.amount}, '${t.type}', 'reject')" 
                class="text-red-500 border border-red-500 px-2 py-1 rounded hover:bg-red-500/10 text-xs font-bold">
                ✗ REJECT
            </button>
        ` : `<span class="text-xs text-gray-500">-</span>`;

        return `
            <tr class="hover:bg-dark-700/30 border-b border-dark-700">
                <td class="p-3 text-xs text-gray-400">${new Date(t.timestamp).toLocaleString('id-ID')}</td>
                <td class="p-3">
                    <p class="font-mono text-xs text-white">${t.userId.substring(0, 10)}...</p>
                </td>
                <td class="p-3">
                    <span class="font-bold uppercase text-xs px-2 py-1 rounded ${t.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}">
                        ${t.type}
                    </span>
                </td>
                <td class="p-3 font-mono font-bold text-white">
                    IDR ${parseInt(t.amount).toLocaleString('id-ID')}
                    ${t.uniqueCode ? `<span class="text-brand-gold text-xs">(+${t.uniqueCode})</span>` : ''}
                </td>
                <td class="p-3 text-xs text-gray-400 max-w-[200px] truncate" title="${t.methodDetails || t.method}">
                    ${t.method || '-'}
                </td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded text-xs font-bold border ${statusClass}">
                        ${t.status.toUpperCase()}
                    </span>
                </td>
                <td class="p-3 text-right">
                    ${actionBtns}
                </td>
            </tr>
        `;
    }).join('');

    const countInfo = document.getElementById('transactionCountInfo');
    if (countInfo) countInfo.innerText = `Showing ${filtered.length} of ${allTransactions.length} transactions`;
}

onValue(transactionsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allTransactions = Object.entries(data).map(([key, val]) => ({ key, ...val }));
        updateTransactionStats();
        renderTransactions();
    } else {
        allTransactions = [];
        updateTransactionStats();
        renderTransactions();
    }
});

window.processTransaction = function (key, uid, amount, type, action) {
    if (!confirm(`${action === 'approve' ? 'SETUJUI' : 'TOLAK'} transaksi ini?`)) return;

    const updates = {};
    updates[`transactions/${key}/status`] = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'approve') {
        get(ref(db, `users/${uid}/balance`)).then(snap => {
            let bal = parseInt(snap.val() || 0);
            amount = parseInt(amount);
            if (type === 'deposit') bal += amount;
            else bal -= amount;

            updates[`users/${uid}/balance`] = bal;
            update(ref(db), updates).then(() => showNotification('Transaksi Disetujui!', 'success'));
        });
    } else {
        update(ref(db), updates).then(() => showNotification('Transaksi Ditolak', 'error'));
    }
}

// Force Reject - Delete transaction permanently
window.forceRejectTransaction = function (key) {
    if (!confirm('⚠️ HAPUS PAKSA transaksi ini? Data akan dihapus permanen dari database.')) return;

    remove(ref(db, `transactions/${key}`)).then(() => {
        showNotification('Transaksi berhasil dihapus secara paksa!', 'success');
    }).catch(err => {
        showNotification('Gagal menghapus: ' + err.message, 'error');
    });
}

// === USER MANAGEMENT ===

window.filterUsers = function (filter) {
    currentUserFilter = filter;

    // Update Button State
    document.querySelectorAll('.user-filter').forEach(btn => {
        if (btn.dataset.filter === filter) btn.classList.add('active', 'bg-dark-700', 'text-white');
        else btn.classList.remove('active', 'bg-dark-700', 'text-white');
        if (btn.dataset.filter !== filter) btn.classList.add('bg-dark-900', 'text-gray-400');
        else btn.classList.remove('bg-dark-900', 'text-gray-400');
    });

    renderUsers();
}

// Search Listener
const userSearchEl = document.getElementById('userSearch');
if (userSearchEl) {
    userSearchEl.addEventListener('input', renderUsers);
}

function renderUsers() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    let filtered = allUsers;

    // Filter by Status
    if (currentUserFilter === 'active') filtered = filtered.filter(u => u.status !== 'banned');
    if (currentUserFilter === 'banned') filtered = filtered.filter(u => u.status === 'banned');

    // Filter by Search
    const searchVal = document.getElementById('userSearch')?.value.toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(u =>
            (u.username && u.username.toLowerCase().includes(searchVal)) ||
            (u.email && u.email.toLowerCase().includes(searchVal))
        );
    }

    tbody.innerHTML = filtered.map(user => {
        const isBanned = user.status === 'banned';
        const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '-';
        return `
        <tr class="hover:bg-dark-700/30 border-b border-dark-700">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center font-bold text-brand-gold border border-dark-600">
                        ${user.username ? user.username.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <p class="font-bold text-white">${user.username || 'No Username'}</p>
                        <p class="text-xs text-gray-400">${user.email}</p>
                    </div>
                </div>
            </td>
            <td class="p-4 font-mono font-bold text-green-400">IDR ${(user.balance || 0).toLocaleString('id-ID')}</td>
            <td class="p-4 text-xs">
                <p><span class="text-gray-400">Ref:</span> <span class="text-brand-gold select-all cursor-pointer">${user.referral_code || '-'}</span></p>
            </td>
            <td class="p-4 text-sm text-gray-400">${joinDate}</td>
            <td class="p-4">
                <span class="px-2 py-1 rounded text-xs font-bold ${isBanned ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}">
                    ${isBanned ? 'BANNED' : 'ACTIVE'}
                </span>
            </td>
            <td class="p-4 text-right flex justify-end gap-2">
                <button onclick="openBalanceModal('${user.uid}', '${user.username || 'User'}')" 
                    class="px-3 py-1 rounded text-xs font-bold border border-brand-gold text-brand-gold hover:bg-brand-gold/10 transition-colors">
                    TOP UP
                </button>
                <button onclick="toggleUserBan('${user.uid}', '${user.status || 'active'}')" 
                    class="px-3 py-1 rounded text-xs font-bold border transition-colors ${isBanned ? 'border-green-500 text-green-500 hover:bg-green-500/10' : 'border-red-500 text-red-500 hover:bg-red-500/10'}">
                    ${isBanned ? 'UNBAN' : 'BAN'}
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

window.openBalanceModal = function (uid, username) {
    document.getElementById('balanceUserUid').value = uid;
    document.getElementById('balanceUsername').innerText = username;
    document.getElementById('balanceAmount').value = '';
    document.getElementById('balanceNote').value = '';
    document.getElementById('balanceModal').classList.remove('hidden');
}

window.handleBalanceSubmit = function (e) {
    e.preventDefault();
    const uid = document.getElementById('balanceUserUid').value;
    const amount = parseInt(document.getElementById('balanceAmount').value);
    const note = document.getElementById('balanceNote').value || 'Manual Top Up from Admin';

    if (!uid || !amount || amount <= 0) return showNotification('Data tidak valid', 'error');

    // 1. Get current balance
    get(ref(db, `users/${uid}/balance`)).then((snap) => {
        const currentBal = parseInt(snap.val()) || 0;
        const newBal = currentBal + amount;

        const updates = {};
        updates[`users/${uid}/balance`] = newBal;

        // 2. Record Transaction History (Auto Approved)
        const transId = push(transactionsRef).key;
        updates[`transactions/${transId}`] = {
            userId: uid,
            type: 'deposit',
            amount: amount,
            status: 'approved',
            method: 'Manual (Admin)',
            timestamp: Date.now(),
            proof: '-',
            note: note
        };

        update(ref(db), updates).then(() => {
            showNotification(`Berhasil tambah saldo IDR ${amount.toLocaleString('id-ID')}`, 'success');
            document.getElementById('balanceModal').classList.add('hidden');
        }).catch(err => showNotification(err.message, 'error'));
    });
}

window.toggleUserBan = function (uid, currentStatus) {
    const isBanned = currentStatus === 'banned';
    const newStatus = isBanned ? 'active' : 'banned';
    const action = isBanned ? 'Unban' : 'Ban';

    if (confirm(`Yakin ingin ${action} user ini?`)) {
        update(ref(db, `users/${uid}`), { status: newStatus })
            .then(() => showNotification(`User berhasi di-${action}`, 'success'))
            .catch(err => showNotification('Gagal update status: ' + err.message, 'error'));
    }
}

// === SIDEBAR ACCORDION ===
window.toggleSubmenu = function (id) {
    const submenu = document.getElementById(`submenu-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);

    // Close other submenus if we had multiple (currently just one)

    if (submenu.classList.contains('hidden')) {
        submenu.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
        switchAdminTab('users'); // Auto switch to users tab parent
    } else {
        submenu.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
}

// === ADMIN SETTINGS ===
const adminSettingsRef = ref(db, 'admin_settings');

// Load Admin Profile
onValue(adminSettingsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        if (data.name) {
            document.querySelectorAll('#adminSidebarName').forEach(el => el.innerText = data.name);
            document.getElementById('editAdminName').value = data.name;
            const settingsName = document.getElementById('settingsAdminName');
            if (settingsName) settingsName.innerText = data.name;
        }
        if (data.avatar) {
            document.querySelectorAll('#adminSidebarAvatar').forEach(el => el.src = data.avatar);
            document.getElementById('editAdminAvatar').value = data.avatar;
            const settingsAvatar = document.getElementById('settingsAdminAvatar');
            if (settingsAvatar) settingsAvatar.src = data.avatar;
        }
    }
});

window.openAdminSettings = function () {
    document.getElementById('adminSettingsModal').classList.remove('hidden');
    // Pre-fill is handled by onValue, but just in case:
    // Values are already bound in the DOM by the previous load
}

window.handleAdminUpdate = function (e) {
    e.preventDefault();
    const name = document.getElementById('editAdminName').value;
    const avatar = document.getElementById('editAdminAvatar').value;

    set(adminSettingsRef, {
        name: name,
        avatar: avatar,
        updatedAt: Date.now()
    }).then(() => {
        showNotification('Profil Admin Diupdate!', 'success');
        document.getElementById('adminSettingsModal').classList.add('hidden');
    });
}

// === BROADCAST NOTIFICATIONS ===
window.openBroadcastModal = function () {
    document.getElementById('broadcastModal').classList.remove('hidden');
}

window.handleBroadcast = function (e) {
    e.preventDefault();
    const message = document.getElementById('broadcastMessage').value;

    if (!message) return;

    push(ref(db, 'notifications/global'), {
        message: message,
        timestamp: Date.now(),
        sender: 'Admin'
    }).then(() => {
        showNotification('Broadcast Terkirim!', 'success');
        document.getElementById('broadcastModal').classList.add('hidden');
        document.getElementById('broadcastMessage').value = '';
    });
}

// === SITE CONFIGURATION ===
const siteConfigRef = ref(db, 'site_config');

// Load site config
onValue(siteConfigRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        const siteNameEl = document.getElementById('configSiteName');
        const logoEl = document.getElementById('configSiteLogo');
        const minDepoEl = document.getElementById('configMinDepo');
        const minWdEl = document.getElementById('configMinWd');

        if (siteNameEl && data.siteName) siteNameEl.value = data.siteName;
        if (logoEl && data.logoUrl) logoEl.value = data.logoUrl;
        if (minDepoEl && data.minDeposit) minDepoEl.value = data.minDeposit;
        if (minWdEl && data.minWithdraw) minWdEl.value = data.minWithdraw;
    }
});

window.handleSiteConfig = function (e) {
    e.preventDefault();

    const siteName = document.getElementById('configSiteName').value;
    const logoUrl = document.getElementById('configSiteLogo')?.value || '';
    const minDepo = parseInt(document.getElementById('configMinDepo').value) || 10000;
    const minWd = parseInt(document.getElementById('configMinWd').value) || 50000;

    update(siteConfigRef, {
        siteName: siteName,
        logoUrl: logoUrl,
        minDeposit: minDepo,
        minWithdraw: minWd,
        updatedAt: Date.now()
    }).then(() => {
        showNotification('Konfigurasi berhasil disimpan!', 'success');
    }).catch(err => {
        showNotification('Gagal menyimpan: ' + err.message, 'error');
    });
}

// === PROMO MANAGEMENT ===
const promosRef = ref(db, 'promos');
let allPromos = [];

onValue(promosRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allPromos = Object.entries(data).map(([key, val]) => ({ key, ...val }));
        renderAdminPromos();
    } else {
        allPromos = [];
        renderAdminPromos();
    }
});

function renderAdminPromos() {
    const grid = document.getElementById('promoGrid');
    if (!grid) return;

    if (allPromos.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                </svg>
                <p>Belum ada promo. Klik "Tambah Promo" untuk membuat promo baru.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = allPromos.map(promo => `
        <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden group">
            <div class="aspect-video bg-gradient-to-br from-brand-purple/20 to-brand-gold/20 relative overflow-hidden">
                ${promo.image ? `<img src="${promo.image}" alt="${promo.title}" class="w-full h-full object-cover">` : `
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-6xl">🎁</span>
                    </div>
                `}
                ${promo.badge ? `<span class="absolute top-3 right-3 px-3 py-1 bg-brand-gold text-dark-900 text-xs font-bold rounded-full">${promo.badge}</span>` : ''}
            </div>
            <div class="p-4">
                <h3 class="font-bold text-white mb-2">${promo.title}</h3>
                <p class="text-gray-400 text-sm mb-3 line-clamp-2">${promo.description}</p>
                <div class="flex gap-2">
                    <button onclick="editPromo('${promo.key}')" 
                        class="flex-1 py-2 bg-dark-700 text-white text-sm rounded-lg hover:bg-dark-600 transition-colors">
                        Edit
                    </button>
                    <button onclick="deletePromo('${promo.key}')" 
                        class="flex-1 py-2 bg-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition-colors">
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

window.openPromoModal = function (key = null) {
    document.getElementById('promoModal').classList.remove('hidden');
    document.getElementById('promoModalTitle').textContent = key ? 'Edit Promo' : 'Tambah Promo';
    document.getElementById('promoKey').value = key || '';

    if (key) {
        const promo = allPromos.find(p => p.key === key);
        if (promo) {
            document.getElementById('promoTitle').value = promo.title || '';
            document.getElementById('promoDescription').value = promo.description || '';
            document.getElementById('promoBadge').value = promo.badge || '';
            document.getElementById('promoImage').value = promo.image || '';
            document.getElementById('promoTerms').value = promo.terms || '';
        }
    } else {
        document.getElementById('promoTitle').value = '';
        document.getElementById('promoDescription').value = '';
        document.getElementById('promoBadge').value = '';
        document.getElementById('promoImage').value = '';
        document.getElementById('promoTerms').value = '';
    }
}

window.editPromo = function (key) {
    openPromoModal(key);
}

window.handlePromoSubmit = function (e) {
    e.preventDefault();

    const key = document.getElementById('promoKey').value;
    const promoData = {
        title: document.getElementById('promoTitle').value,
        description: document.getElementById('promoDescription').value,
        badge: document.getElementById('promoBadge').value || null,
        image: document.getElementById('promoImage').value || null,
        terms: document.getElementById('promoTerms').value || null,
        updatedAt: Date.now()
    };

    if (key) {
        // Update existing
        update(ref(db, `promos/${key}`), promoData).then(() => {
            showNotification('Promo berhasil diperbarui!', 'success');
            document.getElementById('promoModal').classList.add('hidden');
        });
    } else {
        // Create new
        promoData.createdAt = Date.now();
        push(promosRef, promoData).then(() => {
            showNotification('Promo berhasil ditambahkan!', 'success');
            document.getElementById('promoModal').classList.add('hidden');
        });
    }
}

window.deletePromo = function (key) {
    if (!confirm('Hapus promo ini?')) return;
    remove(ref(db, `promos/${key}`)).then(() => {
        showNotification('Promo berhasil dihapus!', 'success');
    });
}

// === RUNNING TEXT MANAGEMENT ===
const runningTextRef = ref(db, 'site_config/running_text');
let runningTextItems = [];

onValue(runningTextRef, (snapshot) => {
    const data = snapshot.val();
    runningTextItems = data ? Object.entries(data).map(([key, val]) => ({ key, text: val })) : [];
    renderRunningTextList();
});

function renderRunningTextList() {
    const list = document.getElementById('runningTextList');
    if (!list) return;

    if (runningTextItems.length === 0) {
        list.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">Belum ada teks. Tambahkan di bawah.</p>`;
        return;
    }

    list.innerHTML = runningTextItems.map(item => `
        <div class="flex items-center gap-3 p-3 bg-dark-900 rounded-lg border border-dark-600">
            <span class="flex-1 text-white text-sm">${item.text}</span>
            <button onclick="deleteRunningText('${item.key}')" 
                class="p-1 text-red-400 hover:text-red-500 transition-colors" title="Hapus">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

window.addRunningText = function () {
    const input = document.getElementById('newRunningText');
    const text = input.value.trim();
    if (!text) return showNotification('Masukkan teks terlebih dahulu', 'error');

    push(runningTextRef, text).then(() => {
        showNotification('Teks berhasil ditambahkan!', 'success');
        input.value = '';
    });
}

window.deleteRunningText = function (key) {
    if (!confirm('Hapus teks ini?')) return;
    remove(ref(db, `site_config/running_text/${key}`)).then(() => {
        showNotification('Teks berhasil dihapus!', 'success');
    });
}

// === PROVIDER API SETTINGS ===
const providerConfigRef = ref(db, 'site_config/provider_settings');

// Load provider settings on init
onValue(providerConfigRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        const modeSwitch = document.getElementById('providerModeSwitch');
        const modeLabel = document.getElementById('providerModeLabel');
        const apiSettings = document.getElementById('providerApiSettings');
        const firebaseInfo = document.getElementById('firebaseModeInfo');

        if (modeSwitch && data.mode === 'api') {
            modeSwitch.checked = true;
            if (modeLabel) modeLabel.textContent = 'API Provider';
            if (apiSettings) apiSettings.classList.remove('hidden');
            if (firebaseInfo) firebaseInfo.classList.add('hidden');
        }

        // Load API settings
        if (document.getElementById('providerApiUrl')) {
            document.getElementById('providerApiUrl').value = data.apiUrl || '';
            document.getElementById('providerApiKey').value = data.apiKey || '';
            document.getElementById('providerSecretKey').value = data.secretKey || '';
            document.getElementById('providerAgentId').value = data.agentId || '';
        }
    }
});

window.toggleProviderMode = function () {
    const modeSwitch = document.getElementById('providerModeSwitch');
    const modeLabel = document.getElementById('providerModeLabel');
    const apiSettings = document.getElementById('providerApiSettings');
    const firebaseInfo = document.getElementById('firebaseModeInfo');

    if (modeSwitch.checked) {
        // API mode
        modeLabel.textContent = 'API Provider';
        apiSettings.classList.remove('hidden');
        firebaseInfo.classList.add('hidden');

        // Test API connection for all providers
        console.log('🔌 API Provider Mode ENABLED - Testing connections...');
        testAllProviderAPIs();
    } else {
        // Firebase mode
        modeLabel.textContent = 'Firebase';
        apiSettings.classList.add('hidden');
        firebaseInfo.classList.remove('hidden');
        console.log('🔥 Firebase Mode ENABLED - Using local database');
    }

    // Save mode to Firebase
    update(providerConfigRef, {
        mode: modeSwitch.checked ? 'api' : 'firebase'
    });
}

// Test all provider API connections
async function testAllProviderAPIs() {
    const providers = ['pragmatic', 'pgsoft', 'habanero', 'spade', 'joker', 'microgaming'];

    for (const provider of providers) {
        try {
            const snap = await get(ref(db, `site_config/provider_apis/${provider}`));
            const data = snap.val();

            if (data && data.apiUrl) {
                console.log(`🎮 [${provider.toUpperCase()}] API Config Found:`);
                console.log(`   URL: ${data.apiUrl}`);
                console.log(`   Key: ${data.apiKey ? '✅ Set' : '❌ Not set'}`);
                console.log(`   Secret: ${data.secretKey ? '✅ Set' : '❌ Not set'}`);

                // Attempt connection test
                try {
                    const response = await fetch(data.apiUrl + '/ping', {
                        method: 'GET',
                        headers: { 'X-API-Key': data.apiKey || '' }
                    });
                    if (response.ok) {
                        console.log(`   Connection: ✅ SUCCESS`);
                    } else {
                        console.log(`   Connection: ⚠️ HTTP ${response.status}`);
                    }
                } catch (e) {
                    console.log(`   Connection: ❌ FAILED (${e.message})`);
                }
            } else {
                console.log(`🎮 [${provider.toUpperCase()}] No API config set`);
            }
        } catch (err) {
            console.error(`❌ Error checking ${provider}:`, err);
        }
    }

    console.log('📊 API Connection test completed');
}

window.saveProviderSettings = function () {
    const settings = {
        mode: document.getElementById('providerModeSwitch').checked ? 'api' : 'firebase',
        apiUrl: document.getElementById('providerApiUrl').value,
        apiKey: document.getElementById('providerApiKey').value,
        secretKey: document.getElementById('providerSecretKey').value,
        agentId: document.getElementById('providerAgentId').value,
        updatedAt: Date.now()
    };

    set(providerConfigRef, settings).then(() => {
        showNotification('Pengaturan provider berhasil disimpan!', 'success');
    }).catch(err => {
        showNotification('Gagal menyimpan: ' + err.message, 'error');
    });
}

// === ADD USER ===
window.openAddUserModal = function () {
    document.getElementById('addUserModal').classList.remove('hidden');
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserUsername').value = '';
    document.getElementById('newUserBalance').value = '0';
}

window.handleAddUser = function (e) {
    e.preventDefault();

    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const username = document.getElementById('newUserUsername').value;
    const balance = parseInt(document.getElementById('newUserBalance').value) || 0;

    // Create user using Firebase Auth
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js").then(({ createUserWithEmailAndPassword }) => {
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const uid = userCredential.user.uid;

                // Create user profile in database
                set(ref(db, `users/${uid}`), {
                    email: email,
                    username: username,
                    balance: balance,
                    provider_balance: 0,
                    referral_code: 'REF' + uid.substring(0, 6).toUpperCase(),
                    status: 'active',
                    created_at: Date.now()
                }).then(() => {
                    showNotification('User berhasil dibuat!', 'success');
                    document.getElementById('addUserModal').classList.add('hidden');
                });
            })
            .catch(err => {
                showNotification('Gagal membuat user: ' + err.message, 'error');
            });
    });
}

// === PER-PROVIDER API SETTINGS ===
const perProviderConfigRef = ref(db, 'site_config/provider_apis');

window.openProviderApiModal = function (provider) {
    const modal = document.getElementById('providerApiModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('providerApiName').value = provider;
        document.getElementById('providerApiModalTitle').textContent = `API Settings: ${provider.toUpperCase()}`;

        // Load existing settings
        get(ref(db, `site_config/provider_apis/${provider}`)).then(snap => {
            const data = snap.val() || {};
            document.getElementById('perProviderUrl').value = data.apiUrl || '';
            document.getElementById('perProviderKey').value = data.apiKey || '';
            document.getElementById('perProviderSecret').value = data.secretKey || '';
        });
    }
}

window.savePerProviderSettings = function () {
    const provider = document.getElementById('providerApiName').value;
    const settings = {
        apiUrl: document.getElementById('perProviderUrl').value,
        apiKey: document.getElementById('perProviderKey').value,
        secretKey: document.getElementById('perProviderSecret').value,
        updatedAt: Date.now()
    };

    set(ref(db, `site_config/provider_apis/${provider}`), settings).then(() => {
        showNotification(`API ${provider} berhasil disimpan!`, 'success');
        document.getElementById('providerApiModal').classList.add('hidden');
    }).catch(err => {
        showNotification('Gagal menyimpan: ' + err.message, 'error');
    });
}
