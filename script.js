// Track lock status in a variable (true = locked, false = unlocked)
let isLocked = true;

// DOM references (Home Tab)
const lockIconDiv = document.getElementById("lock-icon");
const lockMaterialIcon = lockIconDiv.querySelector(".material-symbols-outlined");
const statusText = document.getElementById("status-text");
const scanBtn = document.getElementById("scan-btn");
const loader = document.getElementById("loader");
const checkmarkIcon = document.getElementById("checkmark-icon");
const resultMessage = document.getElementById("result-message");

// DOM references (Location Tab)
const getLocationBtn = document.getElementById("get-location-btn");
const locationDisplay = document.getElementById("location-display");

// Tab navigation
const tabLinks = document.querySelectorAll(".navbar a");
const tabContents = document.querySelectorAll(".tab-content");

/* --------------------------
   FINGERPRINT SCAN SIMULATION
-------------------------- */
scanBtn.addEventListener("click", () => {
  // Clear any old messages
  resultMessage.textContent = "";

  // Show the loader (spinner)
  loader.style.display = "block";

  // Hide checkmark if visible
  checkmarkIcon.style.display = "none";

  // Disable the button while "scanning"
  scanBtn.disabled = true;

  // Simulate ~1.5s scanning delay
  setTimeout(() => {
    // Hide loader
    loader.style.display = "none";
    // Show checkmark
    checkmarkIcon.style.display = "inline-block";

    // After showing checkmark briefly, toggle lock state
    setTimeout(() => {
      // Hide checkmark
      checkmarkIcon.style.display = "none";
      // Toggle lock/unlock
      toggleLockState();
      // Re-enable button
      scanBtn.disabled = false;
    }, 800); // show checkmark for 0.8s
  }, 1500); // scanning simulation time
});

// Toggle lock/unlock state
function toggleLockState() {
  if (isLocked) {
    // If locked, unlock it
    isLocked = false;
    lockIconDiv.classList.remove("locked");
    lockIconDiv.classList.add("unlocked");
    lockMaterialIcon.textContent = "lock_open"; // open lock icon
    statusText.textContent = "UNLOCKED";
    statusText.classList.remove("locked-status");
    statusText.classList.add("unlocked-status");
    resultMessage.textContent = "Device successfully unlocked!";
    scanBtn.textContent = "Scan Fingerprint to Lock";
  } else {
    // If unlocked, lock it
    isLocked = true;
    lockIconDiv.classList.remove("unlocked");
    lockIconDiv.classList.add("locked");
    lockMaterialIcon.textContent = "lock";
    statusText.textContent = "LOCKED";
    statusText.classList.remove("unlocked-status");
    statusText.classList.add("locked-status");
    resultMessage.textContent = "Device locked.";
    scanBtn.textContent = "Scan Fingerprint to Unlock";
  }
}

/* --------------------------
   GEOLOCATION FEATURE
-------------------------- */
if (getLocationBtn) {
  getLocationBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          locationDisplay.textContent = `Latitude: ${lat}, Longitude: ${lon}`;
        },
        (error) => {
          console.error(error);
          locationDisplay.textContent = "Unable to retrieve location.";
        }
      );
    } else {
      locationDisplay.textContent =
        "Geolocation is not supported by your browser.";
    }
  });
}

/* --------------------------
   TAB NAVIGATION LOGIC
-------------------------- */
tabLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    // Remove 'active' class from all tab links
    tabLinks.forEach((l) => l.classList.remove("active"));
    // Add 'active' to the clicked link
    link.classList.add("active");

    // Hide all tab contents
    tabContents.forEach((content) => (content.style.display = "none"));

    // Show the chosen tab
    const targetTab = link.getAttribute("data-tab");
    document.getElementById(targetTab).style.display = "block";
  });
});
