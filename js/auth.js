import { auth } from '../firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";

export function checkAuth(onUserAuthenticated) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const greeting = document.getElementById('user-greeting');
      if (greeting) {
        greeting.textContent = `Hola, ${user.displayName || user.email}`;
      }
      document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = 'index.html');
      });
      onUserAuthenticated(user);
    } else {
      window.location.href = 'index.html';
    }
  });
}