const express = require("express");
const { exec } = require("child_process"); // we use exec to run PowerShell
const path = require("path");

const app = express();
const PORT = 3000;


app.use(express.static(path.join(__dirname, "public")));

// Endpoint to trigger forced removal / data wipe
app.post("/api/ForcedRemoval", (req, res) => {
  
  const scriptPath = "C:\\Users\\name\\Desktop\\ForcedRemoval.ps1";


  // Deletion script
  exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`,
    (error, stdout, stderr) => {
      if (error) {
        console.error("Error running PowerShell script:", error);
        return res.status(500).send("Error executing script.");
      }
      console.log("Script output:", stdout);
      res.status(200).send("Data wipe script executed successfully.");
    }
  );
});

app.post("/api/DriveMonitor", (req, res) => {
  // path to your advanced lock script
  const scriptPath = "C:\\Users\\name\\Desktop\\DriveMonitor.ps1";

  // call it with -ExecutionPolicy Bypass
  exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`,
    (error, stdout, stderr) => {
      if (error) {
        console.error("Error running advanced lock script:", error);
        return res.status(500).send("Error executing script.");
      }
      console.log("Script output:", stdout);
      res.status(200).send("Monitoring script started successfully.");
    }
  );
});

// Server Start
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
