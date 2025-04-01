Add-Type -AssemblyName System.Windows.Forms

$signature = @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32Utils {
        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool EndDialog(IntPtr hDlg, int nResult);
        
        [DllImport("user32.dll")]
        public static extern IntPtr CreateWindowEx(uint dwExStyle, string lpClassName, 
            string lpWindowName, uint dwStyle, int x, int y, int nWidth, int nHeight, 
            IntPtr hWndParent, IntPtr hMenu, IntPtr hInstance, IntPtr lpParam);
        
        [DllImport("user32.dll")]
        public static extern bool DestroyWindow(IntPtr hWnd);
        
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool LockWorkStation();
    }
"@

try {
    if (-not ([System.Management.Automation.PSTypeName]'Win32Utils').Type) {
        Add-Type -TypeDefinition $signature -Language CSharp
    }
} catch {
}

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires administrative privileges. Please run as Administrator."
    exit 1
}

function Show-UniqueMessageBox {
    param(
        [string]$Message,
        [string]$Title,
        [System.Windows.Forms.MessageBoxIcon]$Icon = [System.Windows.Forms.MessageBoxIcon]::Information
    )
    
    $hwnd = [Win32Utils]::FindWindow("#32770", $Title)
    if ($hwnd) {
        [Win32Utils]::EndDialog($hwnd, 1)
        Start-Sleep -Milliseconds 100
    }
    
    $form = New-Object System.Windows.Forms.Form
    $form.TopMost = $true
    $form.Text = $Title
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $form.MinimumSize = New-Object System.Drawing.Size(400, 150)
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $Message
    $label.AutoSize = $true
    $label.Location = New-Object System.Drawing.Point(20, 20)
    $label.MaximumSize = New-Object System.Drawing.Size(360, 0)
    $label.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $form.Controls.Add($label)
    
    $form.ClientSize = New-Object System.Drawing.Size(400, ($label.Height + 60))
    
    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 2000 # Changed to 2 seconds for testing
    $timer.Add_Tick({
        $form.Close()
        $timer.Stop()
        $timer.Dispose()
    })
    
    $form.Add_Shown({
        $timer.Start()
    })
    
    $form.Show()
    Start-Sleep -Seconds 2  # Changed to 2 seconds for testing
    $form.Close()
}

function LockAndExit {
    $currentUser = $env:USERNAME
    try {
        Show-UniqueMessageBox `
            -Message "System is being locked due to security policy." `
            -Title "System Lock" `
            -Icon Warning
        
        Start-Job -ScriptBlock {
            param($username, $driveId)
            
            Add-Type -AssemblyName System.Windows.Forms
            
            $signature = @"
                using System;
                using System.Runtime.InteropServices;
                public class Win32Utils {
                    [DllImport("user32.dll", SetLastError = true)]
                    public static extern bool LockWorkStation();
                }
"@
            
            try {
                if (-not ([System.Management.Automation.PSTypeName]'Win32Utils').Type) {
                    Add-Type -TypeDefinition $signature -Language CSharp
                }
            } catch {
            }
            
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
                        [Win32Utils]::LockWorkStation()
                    }
                } else {
                    net user $username /active:no | Out-Null
                    [Win32Utils]::LockWorkStation()
                }
            }
        } -ArgumentList $currentUser, $drive.DeviceID
        
        [Win32Utils]::LockWorkStation()
        $result = net user $currentUser /active:no
        
    } catch {
        Show-UniqueMessageBox `
            -Message "Error locking system: $_" `
            -Title "Error" `
            -Icon Error
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
            Show-UniqueMessageBox `
                -Message "Drive has been removed! Please reconnect the drive within 10 seconds or the system will be locked." `
                -Title "Drive Disconnected" `
                -Icon Warning
            
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
        Show-UniqueMessageBox `
            -Message "No removable drives detected. System will be locked." `
            -Title "No Drive Found" `
            -Icon Error
        Start-Sleep -Seconds 2  # Changed to 2 seconds for testing
        LockAndExit
    }
}
catch {
    Show-UniqueMessageBox `
        -Message "Failed to perform initial drive detection. System will be locked." `
        -Title "Detection Error" `
        -Icon Error
    Start-Sleep -Seconds 2  # Changed to 2 seconds for testing
    LockAndExit
}

$attempts = 0
$maxAttempts = 3

while ($attempts -lt $maxAttempts) {
    $drive = Get-NewestRemovableDrive
    if (-not $drive) {
        Show-UniqueMessageBox `
            -Message "No removable drive detected. System will be locked." `
            -Title "No Drive Found" `
            -Icon Error
        Start-Sleep -Seconds 2    Changed to 2 seconds for testing
        LockAndExit
    }
    
    $driveLetter = $drive.DeviceID
    if ([string]::IsNullOrEmpty($driveLetter)) {
        Show-UniqueMessageBox `
            -Message "Failed to get drive letter. System will be locked." `
            -Title "Drive Error" `
            -Icon Error
        LockAndExit
    }
    
    $testFile = Join-Path $driveLetter "test.txt"
    
    try {
        New-Item -Path $testFile -ItemType "file" -Force -ErrorAction Stop | Out-Null
        Show-UniqueMessageBox `
            -Message "Drive is unlocked and ready." `
            -Title "Drive Status" `
            -Icon Information
        Start-Sleep -Seconds 2    Changed to 2 seconds for testing
        Remove-Item -Path $testFile -Force -ErrorAction SilentlyContinue
        break
    }
    catch {
        Show-UniqueMessageBox `
            -Message "Drive is locked. Please unlock the drive to continue. (Attempt $($attempts + 1) of $maxAttempts)" `
            -Title "Drive Locked" `
            -Icon Warning
        Start-Sleep -Seconds 2    Changed to 2 seconds for testing
        $attempts++
        continue
    }
}

if ($attempts -eq $maxAttempts) {
    Show-UniqueMessageBox `
        -Message "Drive remains locked after $maxAttempts attempts. System will be locked." `
        -Title "Drive Locked" `
        -Icon Error
    Start-Sleep -Seconds 2    Changed to 2 seconds for testing
    LockAndExit
}

Start-DriveMonitoring -DriveId $drive.DeviceID
