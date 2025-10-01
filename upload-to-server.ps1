# PowerShell script to upload SweepingApps to Ubuntu Server
# Usage: .\upload-to-server.ps1 -ServerIP "192.168.1.100" -Username "ubuntu"

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [string]$RemoteDir = "/opt/sweepingapps"
)

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

Write-Info "Uploading SweepingApps to $Username@$ServerIP..."

# Check if SSH is available
try {
    ssh -V | Out-Null
}
catch {
    Write-Error "SSH is not available. Please install OpenSSH or use WSL."
    Write-Info "Install OpenSSH: winget install OpenSSH.Client"
    exit 1
}

# Create remote directory
Write-Info "Creating remote directory..."
ssh "$Username@$ServerIP" "sudo mkdir -p $RemoteDir && sudo chown $Username`:$Username $RemoteDir"

# Upload application files using scp
Write-Info "Uploading application files..."

# Create temporary tar file with application files
$tempTar = "sweepingapps-upload.tar.gz"
Write-Info "Creating archive..."

# Use WSL or Git Bash to create tar file
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    wsl tar -czf $tempTar --exclude='.git' --exclude='node_modules' --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' --exclude='docker.env' --exclude='logs' --exclude='backup' --exclude='*.log' .
} elseif (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf $tempTar --exclude='.git' --exclude='node_modules' --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' --exclude='docker.env' --exclude='logs' --exclude='backup' --exclude='*.log' .
} else {
    Write-Error "tar command not found. Please install WSL or Git Bash."
    exit 1
}

# Upload tar file
scp $tempTar "$Username@$ServerIP`:~/"

# Extract files on server
Write-Info "Extracting files on server..."
ssh "$Username@$ServerIP" "cd $RemoteDir && tar -xzf ~/$tempTar && rm ~/$tempTar && sudo chown -R $Username`:$Username $RemoteDir && chmod +x $RemoteDir/ubuntu-deploy.sh"

# Clean up local tar file
Remove-Item $tempTar -Force

Write-Success "Files uploaded successfully"

Write-Success "Upload completed!"
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. SSH to your server: ssh $Username@$ServerIP" -ForegroundColor White
Write-Host "2. Run deployment script: sudo $RemoteDir/ubuntu-deploy.sh" -ForegroundColor White
Write-Host "3. Access application at: http://$ServerIP" -ForegroundColor White
Write-Host ""
Write-Warning "Make sure you have SSH access configured to your server!"
