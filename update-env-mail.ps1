# Update .env file to use Resend instead of SMTP
$envFile = ".env"
$content = Get-Content $envFile -Raw

# Replace mail settings
$content = $content -replace 'MAIL_MAILER="smtp"', 'MAIL_MAILER="resend"'
$content = $content -replace 'MAIL_SCHEME="smtps"', 'RESEND_KEY="re_hiZwvc9a_MPwkgcNRcDu6pvRTeapst98W"'
$content = $content -replace 'MAIL_HOST="smtp.gmail.com"', ''
$content = $content -replace 'MAIL_PORT="465"', ''
$content = $content -replace 'MAIL_USERNAME="essuhrms02141960@gmail.com"', ''
$content = $content -replace 'MAIL_PASSWORD="uqmnwrsseruouamt"', ''

# Remove extra blank lines
$content = $content -replace "(`r`n){3,}", "`r`n`r`n"

# Save the file
$content | Set-Content $envFile -NoNewline

Write-Host "✅ .env file updated successfully!"
Write-Host "Mail settings changed from SMTP to Resend"


