function updateLockIcon(locked) {
  const icon = document.getElementById('lock-icon');
  icon.textContent = locked ? '🔒' : '🔓';
  icon.className = `lock ${locked ? 'locked' : 'unlocked'}`;
}

function getLockStatus() {
  fetch('/lock-status')
      .then(res => res.json())
      .then(data => updateLockIcon(data.locked));
}

document.getElementById('startBtn').onclick = () => {
  fetch('/start-script', { method: 'POST' })
      .then(res => res.text())
      .then(msg => {
          document.getElementById('message').textContent = msg;
          updateLockIcon(true);
      })
      .catch(err => document.getElementById('message').textContent = err);
};

document.getElementById('scanBtn').onclick = () => {
  const fp = document.getElementById('fingerprintInput').value.trim();
  fetch('/scan-fingerprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: fp })
  })
  .then(res => res.text().then(msg => {
      document.getElementById('message').textContent = msg;
      getLockStatus();
  }))
  .catch(err => document.getElementById('message').textContent = err);
};

getLockStatus();
