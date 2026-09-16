// auth-guard.js — include on any internal/admin-only DFR page, right after
// firebase-helper.js. Redirects to login.html if nobody is signed in, and
// shows a small "signed in as / sign out" badge if someone is.
//
// IMPORTANT LIMITATION: this only gates the page's UI. It does not, by
// itself, restrict who can read or write the underlying Firestore data —
// that depends entirely on the project's Firestore Security Rules. Treat
// this as a UX door, not a lock on the database itself.

window.dfrAuthReady.then(function (user) {
    if (!user) {
        var next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = 'login.html?next=' + next;
        return;
    }
    injectSignedInBadge(user);
});

function injectSignedInBadge(user) {
    var badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:#0f172a;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 10px;font-family:Outfit,sans-serif;font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
    badge.innerHTML = '<span>' + (user.email || 'Signed in') + '</span>' +
        '<button id="dfrSignOutBtn" style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:4px 9px;font-size:10px;font-weight:900;text-transform:uppercase;cursor:pointer;font-family:Outfit,sans-serif;">Sign Out</button>';
    document.body.appendChild(badge);
    document.getElementById('dfrSignOutBtn').addEventListener('click', function () {
        window.dfrSignOut().then(function () {
            window.location.href = 'login.html';
        });
    });
}
