# Simple Ghostscript Download Script
$url = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs1003/gs1003w64.exe"
$output = "gs1003w64.exe"

Write-Host "Attempting to download Ghostscript..." -ForegroundColor Green

# Try with different methods
try {
    $client = New-Object System.Net.WebClient
    $client.DownloadFile($url, $output)
    $client.Dispose()
    
    if (Test-Path $output) {
        $size = [math]::Round((Get-Item $output).Length / 1MB, 2)
        Write-Host "SUCCESS! Downloaded: $output ($size MB)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Run: .\gs1003w64.exe" -ForegroundColor White
        Write-Host "2. Install with default settings" -ForegroundColor White
        Write-Host "3. Restart your server" -ForegroundColor White
    }
} catch {
    Write-Host "Automatic download failed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://www.ghostscript.com/download/gsdnld.html" -ForegroundColor Cyan
    Write-Host "2. Download the Windows 64-bit installer" -ForegroundColor Cyan
    Write-Host "3. Run the installer as administrator" -ForegroundColor Cyan
    Write-Host "4. Make sure 'Add to PATH' is checked" -ForegroundColor Cyan
}

