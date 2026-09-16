// site-config.js - Dynamic site name and logo loader
// Include this script on all pages to load site configuration from Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase configuration (same as main.js)
const firebaseConfig = {
  apiKey: "AIzaSyA0FTr6qvYEHNqgRSkYLmX0gkR1eB8JVPI",
  authDomain: "slotsilit-cb192.firebaseapp.com",
  databaseURL: "https://slotsilit-cb192-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "slotsilit-cb192",
  storageBucket: "slotsilit-cb192.firebasestorage.app",
  messagingSenderId: "515293089497",
  appId: "1:515293089497:web:5a590bc8faafbbaf91f8c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Load and apply site configuration
function applySiteConfig() {
    const siteConfigRef = ref(db, 'site_config');

    onValue(siteConfigRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Update site name in all elements with class 'site-name'
            if (data.siteName) {
                document.querySelectorAll('.site-name').forEach(el => {
                    el.textContent = data.siteName;
                });
                // Update page title
                const titleParts = document.title.split(' - ');
                if (titleParts.length > 1) {
                    document.title = `${data.siteName} - ${titleParts.slice(1).join(' - ')}`;
                } else {
                    document.title = data.siteName;
                }
            }

            // Update logo in all elements with class 'site-logo'
            if (data.logoUrl) {
                document.querySelectorAll('.site-logo').forEach(el => {
                    if (el.tagName === 'IMG') {
                        el.src = data.logoUrl;
                    }
                });
            }
        }
    });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySiteConfig);
} else {
    applySiteConfig();
}
