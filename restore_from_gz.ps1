param(
    [string]$BackupFile = "backup\sweeping_apps_20251003_100000.sql.gz"
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 Starting restore from compressed backup..." -ForegroundColor Cyan
Write-Host ""

# Check if file exists
if (!(Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Backup file: $BackupFile" -ForegroundColor Green
$fileSize = (Get-Item $BackupFile).Length / 1MB
Write-Host "📊 File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
Write-Host ""

# Stop backend
Write-Host "🛑 Stopping backend..." -ForegroundColor Yellow
docker-compose stop backend
Start-Sleep -Seconds 3

# Extract and restore
Write-Host "📥 Extracting and restoring..." -ForegroundColor Yellow

$inputStream = [System.IO.File]::OpenRead($BackupFile)
$gzipStream = New-Object System.IO.Compression.GzipStream($inputStream, [System.IO.Compression.CompressionMode]::Decompress)
$reader = New-Object System.IO.StreamReader($gzipStream)

# Read all content
$sqlContent = $reader.ReadToEnd()

# Close streams
$reader.Close()
$gzipStream.Close()
$inputStream.Close()

Write-Host "✅ Extracted. SQL size: $([math]::Round($sqlContent.Length / 1MB, 2)) MB" -ForegroundColor Green

# Restore to database
Write-Host "💾 Restoring to database..." -ForegroundColor Yellow
$sqlContent | docker exec -i sweeping-apps-postgres psql -U sweeping_user -d sweeping_apps 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database restored successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Restore failed!" -ForegroundColor Red
    exit 1
}

# Start backend
Write-Host "🚀 Starting backend..." -ForegroundColor Yellow
docker-compose start backend
Start-Sleep -Seconds 5

# Verify
Write-Host ""
Write-Host "📊 Verification:" -ForegroundColor Cyan
docker exec sweeping-apps-postgres psql -U sweeping_user -d sweeping_apps -c "SELECT COUNT(*) as total_orders FROM uploaded_orders;"

Write-Host ""
Write-Host "✅ Restore completed!" -ForegroundColor Green