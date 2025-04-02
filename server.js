const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

let lockState = { locked: false };
let fingerprints = [];
let failedAttempts = 0;
let lockedOutUntil = null;

const LOCK_STATE_FILE = './lockstate.json';
const FINGERPRINTS_FILE = './fingerprints.json';

function saveState() {
    fs.writeFileSync(LOCK_STATE_FILE, JSON.stringify(lockState));
}
function saveFingerprints() {
    fs.writeFileSync(FINGERPRINTS_FILE, JSON.stringify(fingerprints));
}
function loadState() {
    if (fs.existsSync(LOCK_STATE_FILE)) {
        lockState = JSON.parse(fs.readFileSync(LOCK_STATE_FILE));
    }
    if (fs.existsSync(FINGERPRINTS_FILE)) {
        fingerprints = JSON.parse(fs.readFileSync(FINGERPRINTS_FILE));
    }
}
loadState();

app.get('/lock-status', (req, res) => {
    res.json({ locked: lockState.locked });
});

app.post('/start-script', (req, res) => {
    if (lockState.locked) return res.status(400).send("Already locked");
    exec('powershell -ExecutionPolicy Bypass -File DriveMonitor.ps1', (error, stdout, stderr) => {
        if (error) return res.status(500).send(error.message);
        lockState.locked = true;
        saveState();
        res.send("DriveMonitor started.");
    });
});

app.post('/scan-fingerprint', (req, res) => {
    const { fingerprint } = req.body;

    const now = Date.now();
    if (lockedOutUntil && now < lockedOutUntil) {
        const wait = Math.ceil((lockedOutUntil - now) / 1000);
        return res.status(403).send(`Too many failed attempts. Try again in ${wait}s.`);
    }

    if (fingerprints.includes(fingerprint)) {
        lockState.locked = false;
        failedAttempts = 0;
        lockedOutUntil = null;
        saveState();
        return res.send("Unlocked successfully.");
    } else {
        failedAttempts++;
        if (failedAttempts >= 3) {
            lockedOutUntil = Date.now() + 60 * 1000;
            return res.status(403).send("Locked out due to too many attempts. Try again in 60 seconds.");
        }
        return res.status(401).send(`Invalid fingerprint. Attempts left: ${3 - failedAttempts}`);
    }
});

app.post('/add-fingerprint', (req, res) => {
    const { fingerprint } = req.body;
    if (!fingerprint) return res.status(400).send("Fingerprint is required.");
    if (fingerprints.includes(fingerprint)) return res.status(400).send("Fingerprint already exists.");
    fingerprints.push(fingerprint);
    saveFingerprints();
    res.send("Fingerprint added.");
});

app.listen(PORT, () => {
    console.log(`SecureLock running at http://localhost:${PORT}`);
});
