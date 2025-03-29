// Track lock status in a variable (true = locked, false = unlocked)
let isLocked = true;

// Track failed attempts
let failedAttempts = 0;
const MAX_FAILED_ATTEMPTS = 3;  // after 3 invalid scans, we do forced removal

// Fingerprint storage: can hold up to 3
let storedFingerprints = [];

// DOM references (Home Tab)
const lockIconDiv = document.getElementById("lock-icon");
const lockMaterialIcon = lockIconDiv.querySelector(".material-symbols-outlined");
const statusText = document.getElementById("status-text");
const scanBtn = document.getElementById("scan-btn");
const loader = document.getElementById("loader");
const checkmarkIcon = document.getElementById("checkmark-icon");
const resultMessage = document.getElementById("result-message");

// DOM references (Forced Removal)
const forceRemoveBtn = document.getElementById("force-remove-btn");
const removalResult = document.getElementById("removal-result");

// DOM references (Location Tab)
const getLocationBtn = document.getElementById("get-location-btn");
const locationDisplay = document.getElementById("location-display");

// DOM references (Fingerprints Tab)
const addFingerprintBtn = document.getElementById("add-fingerprint-btn");
const fingerprintListDiv = document.getElementById("fingerprint-list");

// Tab navigation
const tabLinks = document.querySelectorAll(".navbar a");
const tabContents = document.querySelectorAll(".tab-content");

/* --------------------------
   FINGERPRINT SCAN (Lock/Unlock)
-------------------------- */
if (scanBtn) {
  scanBtn.addEventListener("click", () => {
    // Clear any old messages
    resultMessage.textContent = "";

    // Show the loader (spinner)
    loader.style.display = "block";

    // Hide checkmark if visible
    checkmarkIcon.style.display = "none";

    // Disable the button while scanning
    scanBtn.disabled = true;

    // Simulate ~1.5s scanning delay
    setTimeout(() => {
      loader.style.display = "none";

      // Attempt to match a stored fingerprint
      const success = simulateFingerprintCheck();
      if (success) {
        checkmarkIcon.style.display = "inline-block";
        setTimeout(() => {
          checkmarkIcon.style.display = "none";
          toggleLockState();
          scanBtn.disabled = false;
        }, 800);
      } else {
        // Fingerprint mismatch
        failedAttempts++;
        resultMessage.textContent =
          `Fingerprint not recognized. Attempts: ${failedAttempts} of ${MAX_FAILED_ATTEMPTS}.`;

        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
          forcedRemovalSequence();
        }
        scanBtn.disabled = false;
      }
    }, 1500);
  });
}

// Return true if we have at least 1 stored fingerprint, with a 70% success chance
function simulateFingerprintCheck() {
  if (storedFingerprints.length === 0) {
    return false;
  }
  return Math.random() < 0.7;
}

// Toggle lock/unlock state
function toggleLockState() {
  if (isLocked) {
    // If locked, unlock it
    isLocked = false;
    failedAttempts = 0; // reset attempts
    lockIconDiv.classList.remove("locked");
    lockIconDiv.classList.add("unlocked");
    lockMaterialIcon.textContent = "lock_open";
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
   FORCED REMOVAL
-------------------------- */
if (forceRemoveBtn) {
  forceRemoveBtn.addEventListener("click", () => {
    forcedRemovalSequence();
  });
}

// Trigger the forced removal script via Node
function forcedRemovalSequence() {
  removalResult.textContent = "Forcing removal... data wipe triggered.";

  fetch("/api/forcedRemoval", { method: "POST" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Forced removal script failed or not found");
      }
      return response.text();
    })
    .then((serverMessage) => {
      removalResult.textContent = "Server says: " + serverMessage;
      alert("Data wipe completed (simulated).");
      // Optionally re-lock the device if it's unlocked
      if (!isLocked) {
        toggleLockState();
      }
    })
    .catch((err) => {
      console.error(err);
      removalResult.textContent = "Error: " + err.message;
    });
} 


function startDriveMonitoring() {
  fetch("/api/monitorLock", { method: "POST" })
    .then(response => {
      if (!response.ok) {
        throw new Error("Monitoring script failed.");
      }
      return response.text();
    })
    .then(msg => {
      alert("Monitoring script started: " + msg);
    })
    .catch(err => {
      console.error(err);
      alert("Error: " + err.message);
    });
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
   FINGERPRINT MANAGEMENT
-------------------------- */
if (addFingerprintBtn) {
  addFingerprintBtn.addEventListener("click", () => {
    if (storedFingerprints.length >= 3) {
      alert("Maximum of 3 fingerprints reached. Remove one first.");
      return;
    }

    // Simulate scanning for a new fingerprint
    const scanning = confirm("Place finger on scanner. OK to simulate success, Cancel to simulate fail.");
    if (!scanning) {
      alert("Fingerprint scan failed.");
      return;
    }

    // If scanning success, ask user to name it
    const fName = prompt("Enter a name for this fingerprint:", "My Fingerprint");
    if (!fName) {
      alert("No name entered. Fingerprint not added.");
      return;
    }

    storedFingerprints.push({ name: fName });
    updateFingerprintList();
  });
}

function updateFingerprintList() {
  fingerprintListDiv.innerHTML = "";

  storedFingerprints.forEach((fp, idx) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "fingerprint-item";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = fp.name;
    itemDiv.appendChild(nameSpan);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      storedFingerprints.splice(idx, 1);
      updateFingerprintList();
    });
    itemDiv.appendChild(removeBtn);

    fingerprintListDiv.appendChild(itemDiv);
  });
}

/* --------------------------
   CONNECTION MANAGEMENT
-------------------------- */
// Keep an array of connected phones
let connectedPhones = [];

// DOM references for the Phones tab
const addPhoneBtn = document.getElementById("add-phone-btn");
const phoneListDiv = document.getElementById("phone-list");

// NEW: Bluetooth scan button
const scanBluetoothBtn = document.getElementById("scan-bluetooth-btn");

// 1) Existing: Manual “Add Phone (Simulate)”
if (addPhoneBtn) {
  addPhoneBtn.addEventListener("click", () => {
    const confirmScan = confirm("Start phone pairing? Click OK to simulate success.");
    if (!confirmScan) {
      alert("Phone pairing canceled or failed.");
      return;
    }

    const phoneName = prompt("Enter a name for this phone:", "My Phone");
    if (!phoneName) {
      alert("No phone name entered. Phone not added.");
      return;
    }

    connectedPhones.push({ name: phoneName });
    updatePhoneList();
  });
}

// 2) Bluetooth scanning
if (scanBluetoothBtn) {
  scanBluetoothBtn.addEventListener("click", async () => {
    // Check if Web Bluetooth is available
    if (!navigator.bluetooth) {
      alert("Web Bluetooth API is not supported in this browser!");
      return;
    }
    try {
      // This will prompt the user to select a nearby BLE device
      // acceptAllDevices:true => show all BLE devices in range
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true
        // Or if you want specific services:
        // filters: [{ services: ['battery_service'] }]
      });

      if (!device) {
        alert("No device selected or pairing failed.");
        return;
      }

      // device.name is the name the peripheral advertises
      alert(`Bluetooth device selected: ${device.name}`);

      // If the user wants to store this device in the phone list:
      connectedPhones.push({ name: device.name || "Unnamed Bluetooth Device" });
      updatePhoneList();

      // If you want to connect (optional):
      // const server = await device.gatt.connect();
      // console.log('Bluetooth GATT server connected:', server);

    } catch (err) {
      console.error(err);
      alert(`Bluetooth scan error: ${err.message}`);
    }
  });
}

/*
  Renders the phone list to the DOM
*/
function updatePhoneList() {
  phoneListDiv.innerHTML = "";

  connectedPhones.forEach((phone, idx) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "phone-item";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = phone.name;
    itemDiv.appendChild(nameSpan);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      connectedPhones.splice(idx, 1);
      updatePhoneList();
    });
    itemDiv.appendChild(removeBtn);

    phoneListDiv.appendChild(itemDiv);
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
