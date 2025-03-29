if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires administrative privileges. Please run as Administrator."
    exit 1
}


function LockAndExit {
    $osInfo = Get-CimInstance Win32_OperatingSystem
    $osVersion = $osInfo.Caption
   
    Write-Output "Attempting to lock user account..."
    $currentUser = $env:USERNAME
    try {
        Start-Job -ScriptBlock {
            param($username, $driveId)
           
            while ($true) {
                Start-Sleep -Seconds 2
               
                $drive = Get-CimInstance Win32_LogicalDisk | Where-Object {
                    $_.DeviceID -eq $driveId
                }
               
                if ($drive) {
                    $testFile = Join-Path $drive.DeviceID "test.txt"
                    try {
                        New-Item -Path $testFile -ItemType "file" -Force -ErrorAction Stop | Out-Null
                        Remove-Item -Path $testFile -Force -ErrorAction SilentlyContinue
                       
                        net user $username /active:yes | Out-Null
                        return
                    } catch {
                        net user $username /active:no | Out-Null
                       
                        $signature = @"
                            [DllImport("user32.dll", SetLastError = true)]
                            public static extern bool LockWorkStation();
"@
                        $LockWorkStation = Add-Type -MemberDefinition $signature -Name "Win32LockWorkStation" -Namespace Win32Functions -PassThru
                        $LockWorkStation::LockWorkStation() | Out-Null
                    }
                } else {
                    net user $username /active:no | Out-Null
                   
                    $signature = @"
                        [DllImport("user32.dll", SetLastError = true)]
                        public static extern bool LockWorkStation();
"@
                    $LockWorkStation = Add-Type -MemberDefinition $signature -Name "Win32LockWorkStation" -Namespace Win32Functions -PassThru
                    $LockWorkStation::LockWorkStation() | Out-Null
                }
            }
        } -ArgumentList $currentUser, $drive.DeviceID
       
        $signature = @"
            [DllImport("user32.dll", SetLastError = true)]
            public static extern bool LockWorkStation();
"@
        $LockWorkStation = Add-Type -MemberDefinition $signature -Name "Win32LockWorkStation" -Namespace Win32Functions -PassThru
        $LockWorkStation::LockWorkStation() | Out-Null
       
        $result = net user $currentUser /active:no
        Write-Output "Lock command result: $result"
        Write-Output "Account $currentUser has been disabled"
       
    } catch {
        Write-Output "Error locking account: $_"
    }
    exit 1
}


function Get-NewestRemovableDrive {
    try {
        $removableDrives = Get-CimInstance Win32_LogicalDisk | Where-Object {
            $_.DeviceID -ne "C:" -and ($_.DriveType -eq 2 -or $_.DriveType -eq 3)
        }


        if ($removableDrives) {
            $selected = $removableDrives | Select-Object -First 1
            return $selected
        } else {
            return $null
        }
    }
    catch {
        Write-Error "Failed to detect drives: $_"
        return $null
    }
}


function Start-DriveMonitoring {
    param($DriveId)
   
    while ($true) {
        Start-Sleep -Seconds 2
        $currentDrive = Get-NewestRemovableDrive
       
        if (-not $currentDrive -or $currentDrive.DeviceID -ne $DriveId) {
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show(
                "Drive has been removed! Please reconnect the drive within 10 seconds or the system will be locked.",
                "Drive Disconnected",
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Warning)
           
            $timeoutSeconds = 10
            $startTime = Get-Date
            $driveReconnected = $false
           
            do {
                Start-Sleep -Seconds 1
                $checkDrive = Get-NewestRemovableDrive
                if ($checkDrive -and $checkDrive.DeviceID -eq $DriveId) {
                    $driveReconnected = $true
                    break
                }
                $elapsedTime = ((Get-Date) - $startTime).TotalSeconds
            } while ($elapsedTime -lt $timeoutSeconds)
           
            if ($driveReconnected) {
                continue
            } else {
                LockAndExit
            }
        }
    }
}


try {
    $initialDrive = Get-NewestRemovableDrive
    if ($null -eq $initialDrive) {
        Write-Error "No removable drives detected. Exiting script."
        LockAndExit
    }
}
catch {
    Write-Error "Failed to perform initial drive detection. Exiting script."
    LockAndExit
}


$attempts = 0
$maxAttempts = 3


while ($attempts -lt $maxAttempts) {
    $drive = Get-NewestRemovableDrive
    if (-not $drive) {
        Write-Output "No removable drive detected. System will be locked."
        LockAndExit
    }
   
    $driveLetter = $drive.DeviceID
    if ([string]::IsNullOrEmpty($driveLetter)) {
        Write-Output "Failed to get drive letter. System will be locked."
        LockAndExit
    }
   
    $testFile = Join-Path $driveLetter "test.txt"
   
    try {
        New-Item -Path $testFile -ItemType "file" -Force -ErrorAction Stop | Out-Null
        Write-Output "Drive is unlocked (write successful)."
        Remove-Item -Path $testFile -Force -ErrorAction SilentlyContinue
        break
    }
    catch {
        Write-Output "Drive is locked (write failed)."
        Write-Output "`nWaiting 2 seconds for drive to be unlocked (Attempt $($attempts + 1) of $maxAttempts)..."
        Write-Output "Please unlock the drive if you want the script to continue."
        Start-Sleep -Seconds 2
        $attempts++
        continue
    }
}


if ($attempts -eq $maxAttempts) {
    Write-Output "`nDrive remains locked after $maxAttempts attempts. Script will now exit."
    LockAndExit
}


Start-Job -ScriptBlock {
    param($DriveId)
    . $using:MyInvocation.MyCommand.Path
    Start-DriveMonitoring -DriveId $DriveId
} -ArgumentList $drive.DeviceID