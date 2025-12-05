# Download Ghostscript Installer
Write-Host "Downloading Ghostscript installer..." -ForegroundColor Green

# Latest stable version
$url = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs1003/gs1003w64.exe"
$output = "gs1003w64.exe"

try {
    Write-Host "Downloading from: $url" -ForegroundColor Yellow
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    
    if (Test-Path $output) {
        $fileSize = (Get-Item $output).Length / 1MB
        Write-Host ""
        Write-Host "Download complete!" -ForegroundColor Green
        Write-Host "File: $output" -ForegroundColor Cyan
        Write-Host "Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To install:" -ForegroundColor Yellow
        Write-Host "1. Right-click on gs1003w64.exe and select Run as administrator" -ForegroundColor White
        Write-Host "2. Follow the installation wizard" -ForegroundColor White
        Write-Host "3. Make sure Add to PATH is checked during installation" -ForegroundColor White
        Write-Host "4. Restart your Laravel server after installation" -ForegroundColor White
    } else {
        Write-Host "Download failed - file not found" -ForegroundColor Red
    }
} catch {
    Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Download manually from:" -ForegroundColor Yellow
    Write-Host "https://www.ghostscript.com/download/gsdnld.html" -ForegroundColor Cyan
}
