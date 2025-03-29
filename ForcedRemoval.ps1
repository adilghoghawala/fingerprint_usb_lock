Write-Host "Forced removal triggered..."
# For a safe test, remove a single test file or folder
Remove-Item -Path "C:\Users\Luke\Desktop\CRITICALINFO" -Recurse -Force
Write-Host "Data wipe complete."
