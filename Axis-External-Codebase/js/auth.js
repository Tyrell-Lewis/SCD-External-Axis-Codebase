import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

export function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
    Object.keys(localStorage)
        .filter((k) => k.startsWith("quiz:"))
        .forEach((k) => localStorage.remove(k));
    await signOut(auth);
}