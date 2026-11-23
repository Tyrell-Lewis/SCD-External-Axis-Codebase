import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBVGzQl7nrp8uAc5mY5KqAh6RztLO45eU4",
    authDomain: "axis-external.firebaseapp.com",
    projectId: "axis-external",
    storageBucket: "axis-external.firebasestorage.app",
    messagingSenderId: "67389660095",
    appId: "1:67389660095:web:b568b85da7991b5a455f0a"
  };


export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);