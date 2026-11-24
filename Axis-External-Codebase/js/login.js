import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { login, logout, friendlyError } from "./auth.js";


console.log("login.js loaded")

const $ = (id) => document.getElementById(id);

onAuthStateChanged(auth, (user) => {
    $("login-view").hidden = !!user;
    $("signed-in-view").hidden = !user;
    if (user) {
        $("who").textContent = user.email;
        console.log("went to this redirect")
        window.location.href = "home.html"; // redirect to assssment page
    }
});

$("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("login-btn");
    const err = $("login-error");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Signing in...";
    try {
        await login($("email").value.trim(), $("password").value);
    }catch (ex) {
        console.error("login failed: ", ex.code, ex.message, ex.customData);
        err.textContent = friendlyError(ex.code);
        err.hidden = false;
    } finally {
        btn.disabled = false;
        btn.textContent = "Sign In";
    }
});

$("logout-btn").addEventListener("click", logout);