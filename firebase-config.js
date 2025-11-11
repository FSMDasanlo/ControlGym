// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYut-MRdq5Sdn_U5IQv4l_EF1X0JJ4e70",
  authDomain: "controlgym-4190e.firebaseapp.com",
  projectId: "controlgym-4190e",
  storageBucket: "controlgym-4190e.firebasestorage.app",
  messagingSenderId: "488604272453",
  appId: "1:488604272453:web:c83ad35e9be910a2f2a02c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Export firestore instance
export const db = getFirestore(app);
export const auth = getAuth(app);