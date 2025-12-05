# PDF/DOCX Conversion Guide for Certificate Templates

## Overview

The certificate template system now supports uploading PDF, DOCX, and image files. These files are automatically converted to images for preview and use in the drag-and-drop editor.

## Supported File Types

- **Images**: JPG, JPEG, PNG (direct support)
- **PDF**: Requires Imagick extension OR Ghostscript
- **DOCX**: Requires LibreOffice (for conversion via PDF)

## Conversion Methods

### 1. Image Files
- Directly stored and used
- Dimensions auto-detected
- No conversion needed

### 2. PDF Files
The system tries multiple methods in order:

1. **Imagick Extension** (Preferred)
   - Requires PHP Imagick extension
   - Converts first page to PNG at 150 DPI
   - Fast and reliable

2. **Ghostscript** (Fallback)
   - Requires Ghostscript installed on server
   - Uses command-line: `gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r150`
   - Converts first page to PNG

3. **Fallback**
   - If neither is available, PDF is stored as-is
   - Default dimensions (1200x800) are used
   - User can manually adjust dimensions

### 3. DOCX Files
The system tries:

1. **LibreOffice** (Preferred)
   - Converts DOCX → PDF → Image
   - Requires LibreOffice installed: `libreoffice --headless --convert-to pdf`
   - Then uses PDF conversion method above

2. **Fallback**
   - If LibreOffice not available, DOCX is stored as-is
   - Default dimensions (1200x800) are used
   - User can manually adjust dimensions

## Installation Requirements

### For PDF Conversion

**Option 1: Install Imagick Extension (Recommended)**
```bash
# Ubuntu/Debian
sudo apt-get install php-imagick

# Windows (XAMPP)
# Download from PECL or enable in php.ini
extension=php_imagick.dll
```

**Option 2: Install Ghostscript**
```bash
# Ubuntu/Debian
sudo apt-get install ghostscript

# Windows
# Download from: https://www.ghostscript.com/download/gsdnld.html
```

### For DOCX Conversion

**Install LibreOffice**
```bash
# Ubuntu/Debian
sudo apt-get install libreoffice

# Windows
# Download from: https://www.libreoffice.org/download/
```

## How It Works

1. **Upload**: User uploads PDF/DOCX/image file
2. **Conversion**: System attempts to convert to PNG image
3. **Storage**: Converted image stored in `storage/app/public/certificate-templates/temp/`
4. **Preview**: Image displayed in drag-and-drop editor
5. **Final Save**: Image moved to `storage/app/public/certificate-templates/backgrounds/`

## Troubleshooting

### PDF Not Converting

**Check if Imagick is available:**
```php
php -r "echo extension_loaded('imagick') ? 'Imagick loaded' : 'Imagick not loaded';"
```

**Check if Ghostscript is available:**
```bash
gs --version
```

**Check logs:**
```bash
tail -f storage/logs/laravel.log | grep -i "pdf\|conversion"
```

### DOCX Not Converting

**Check if LibreOffice is available:**
```bash
libreoffice --version
```

**Check logs:**
```bash
tail -f storage/logs/laravel.log | grep -i "docx\|libreoffice"
```

### Fallback Behavior

If conversion fails:
- Original file is stored
- Default dimensions (1200x800) are used
- User can manually adjust dimensions in the editor
- System logs a warning

## File Size Limits

- Maximum file size: 10MB
- Recommended: Under 5MB for faster processing

## Performance Notes

- PDF conversion: ~1-3 seconds per file
- DOCX conversion: ~3-5 seconds per file (includes PDF step)
- Image files: Instant (no conversion)

## Best Practices

1. **For PDFs**: Use single-page PDFs when possible
2. **For DOCX**: Keep formatting simple for better conversion
3. **For Images**: Use PNG or high-quality JPG
4. **Dimensions**: Recommended 1200x800px or higher for certificates

## Testing Conversion

You can test conversion capabilities:

```php
php artisan tinker

$converter = new \App\Services\CertificateTemplateConverter();
$file = \Illuminate\Http\UploadedFile::fake()->create('test.pdf', 1000);
$result = $converter->convertToImage($file);
dd($result);
```

## Future Enhancements

- Support for multi-page PDFs (currently uses first page only)
- Support for other document formats (ODT, RTF)
- Cloud-based conversion service integration
- Batch conversion for multiple templates








