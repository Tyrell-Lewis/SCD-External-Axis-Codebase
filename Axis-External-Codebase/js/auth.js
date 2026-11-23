import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

export function friendlyError(code) {
    if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/user-disabled"
    ) {
        return "Incorrect email or password, or the account is unavailable. Contact the organiser if you think this is a mistake.";
    }

    if (
        code === "auth/invalid-email"
    ) {
        return "Not a valid email address!";
    }
    
    if (
        code === "auth/too-many-requests"
    ) {
        return "Too many attempts. Wait a few minutes then try again!";
    }
    
    if (
        code === "auth/network-request-failed"
    ) {
        return "Network problem. Check your connectionand try again!";
    }
    return "Could not sign in. Please try again."

}


export function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
    Object.keys(localStorage)
        .filter((k) => k.startsWith("quiz:"))
        .forEach((k) => localStorage.removeItem(k));
    await signOut(auth);
}