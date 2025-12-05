<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Settings;

class CertificateTemplateConverter
{
    private static ?string $cachedLibreOfficePath = null;
    private static ?string $cachedGhostscriptPath = null;
    /**
     * Convert uploaded file (PDF, DOCX, or image) to an image for preview
     * 
     * @param \Illuminate\Http\UploadedFile $file
     * @return array{path: string, width: int, height: int, type: string}|null
     */
    public function convertToImage($file): ?array
    {
        $mimeType = $file->getMimeType();
        $extension = strtolower($file->getClientOriginalExtension());

        try {
            // Handle images directly
            if (str_starts_with($mimeType, 'image/')) {
                return $this->handleImage($file);
            }

            // Handle PDF
            if ($mimeType === 'application/pdf' || $extension === 'pdf') {
                return $this->handlePdf($file);
            }

            // Handle DOCX
            if (
                $mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                $extension === 'docx'
            ) {
                return $this->handleDocx($file);
            }

            Log::warning('Unsupported file type for certificate template', [
                'mime_type' => $mimeType,
                'extension' => $extension,
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Failed to convert certificate template file', [
                'file' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return null;
        }
    }

    /**
     * Handle image files - just store and return dimensions
     */
    protected function handleImage($file): ?array
    {
        $path = $file->store('certificate-templates/temp', 'public');
        $fullPath = Storage::disk('public')->path($path);

        // Get image dimensions
        $imageInfo = @getimagesize($fullPath);
        if (!$imageInfo) {
            Log::warning('Failed to get image dimensions', ['path' => $fullPath]);
            return null;
        }

        return [
            'path' => $path,
            'width' => $imageInfo[0],
            'height' => $imageInfo[1],
            'type' => 'image',
        ];
    }

    /**
     * Handle PDF files - convert to image
     * 
     * Note: This requires either:
     * 1. Imagick extension (preferred)
     * 2. Ghostscript + ImageMagick command line tools
     * 3. Or a fallback to store PDF and extract first page as image
     */
    protected function handlePdf($file): ?array
    {
        // Store PDF temporarily
        $pdfPath = $file->store('certificate-templates/temp', 'public');
        $pdfFullPath = Storage::disk('public')->path($pdfPath);

        // Try using Imagick if available
        if (extension_loaded('imagick')) {
            return $this->convertPdfWithImagick($pdfFullPath, $pdfPath);
        }

        // Try using Ghostscript command line
        if ($this->hasGhostscript()) {
            return $this->convertPdfWithGhostscript($pdfFullPath, $pdfPath);
        }

        // Fallback: Cannot convert - return null so frontend knows conversion failed
        Log::warning('PDF conversion not available - Imagick or Ghostscript required', [
            'pdf_path' => $pdfPath,
        ]);

        // Don't return the PDF path - return null to indicate conversion failed
        // The original file will still be stored by the controller
        return null;
    }

    /**
     * Convert PDF to image using Imagick
     */
    protected function convertPdfWithImagick(string $pdfPath, string $storagePath): ?array
    {
        try {
            $imagick = new \Imagick();
            $imagick->setResolution(150, 150); // 150 DPI
            $imagick->readImage($pdfPath . '[0]'); // First page only
            $imagick->setImageFormat('png');
            $imagick->setImageCompressionQuality(90);

            // Save as PNG
            $imagePath = str_replace('.pdf', '.png', $storagePath);
            $imageFullPath = Storage::disk('public')->path($imagePath);
            $imagick->writeImage($imageFullPath);

            $width = $imagick->getImageWidth();
            $height = $imagick->getImageHeight();

            $imagick->clear();
            $imagick->destroy();

            // Delete original PDF
            Storage::disk('public')->delete($pdfPath);

            return [
                'path' => $imagePath,
                'width' => $width,
                'height' => $height,
                'type' => 'image',
            ];
        } catch (\Exception $e) {
            Log::error('Imagick PDF conversion failed', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Get Ghostscript command path
     */
    protected function getGhostscriptCommand(): ?string
    {
        // Return cached result if available
        if (self::$cachedGhostscriptPath !== null) {
            return self::$cachedGhostscriptPath ?: null;
        }
        // On Windows, try common paths first
        if (PHP_OS_FAMILY === 'Windows') {
            $possiblePaths = [
                'C:\\Program Files\\gs\\bin\\gswin64c.exe',
                'C:\\Program Files\\gs\\bin\\gswin32c.exe',
                'C:\\Program Files (x86)\\gs\\bin\\gswin64c.exe',
                'C:\\Program Files (x86)\\gs\\bin\\gswin32c.exe',
            ];

            $programFiles = getenv('PROGRAMFILES');
            if ($programFiles) {
                $possiblePaths[] = $programFiles . '\\gs\\bin\\gswin64c.exe';
                $possiblePaths[] = $programFiles . '\\gs\\bin\\gswin32c.exe';
            }

            $programFilesX86 = getenv('PROGRAMFILES(X86)');
            if ($programFilesX86) {
                $possiblePaths[] = $programFilesX86 . '\\gs\\bin\\gswin64c.exe';
                $possiblePaths[] = $programFilesX86 . '\\gs\\bin\\gswin32c.exe';
            }

            // Also check for Ghostscript with version numbers (e.g., gs10.06.0, gs10.03.1)
            $gsVersions = ['10.06.0', '10.05.0', '10.04.0', '10.03.1', '10.03.0', '10.02.1', '10.02.0', '10.01.2', '10.01.1', '10.01.0', '10.00.0', '9.56.1', '9.56.0', '9.55.0', '9.54.0'];
            foreach ($gsVersions as $version) {
                $possiblePaths[] = "C:\\Program Files\\gs\\gs{$version}\\bin\\gswin64c.exe";
                $possiblePaths[] = "C:\\Program Files\\gs\\gs{$version}\\bin\\gswin32c.exe";
                $possiblePaths[] = "C:\\Program Files (x86)\\gs\\gs{$version}\\bin\\gswin64c.exe";
                $possiblePaths[] = "C:\\Program Files (x86)\\gs\\gs{$version}\\bin\\gswin32c.exe";
                if ($programFiles) {
                    $possiblePaths[] = "{$programFiles}\\gs\\gs{$version}\\bin\\gswin64c.exe";
                    $possiblePaths[] = "{$programFiles}\\gs\\gs{$version}\\bin\\gswin32c.exe";
                }
                if ($programFilesX86) {
                    $possiblePaths[] = "{$programFilesX86}\\gs\\gs{$version}\\bin\\gswin64c.exe";
                    $possiblePaths[] = "{$programFilesX86}\\gs\\gs{$version}\\bin\\gswin32c.exe";
                }
            }

            // Try to dynamically find any gs* version folder
            $gsBasePaths = [
                'C:\\Program Files\\gs',
                'C:\\Program Files (x86)\\gs',
            ];
            if ($programFiles) {
                $gsBasePaths[] = $programFiles . '\\gs';
            }
            if ($programFilesX86) {
                $gsBasePaths[] = $programFilesX86 . '\\gs';
            }

            foreach ($gsBasePaths as $basePath) {
                if (is_dir($basePath)) {
                    // Look for any gs*.*.* folder
                    $dirs = @scandir($basePath);
                    if ($dirs) {
                        foreach ($dirs as $dir) {
                            if ($dir !== '.' && $dir !== '..' && is_dir($basePath . '\\' . $dir) && preg_match('/^gs\d+\.\d+\.\d+/', $dir)) {
                                $possiblePaths[] = $basePath . '\\' . $dir . '\\bin\\gswin64c.exe';
                                $possiblePaths[] = $basePath . '\\' . $dir . '\\bin\\gswin32c.exe';
                            }
                        }
                    }
                }
            }

            Log::info('Checking Ghostscript paths on Windows', ['paths_count' => count($possiblePaths)]);

            foreach ($possiblePaths as $path) {
                if (file_exists($path)) {
                    Log::info('Found Ghostscript at path, testing', ['path' => $path]);
                    // Test if it works - suppress output on Windows
                    $command = '"' . $path . '" --version';
                    if (PHP_OS_FAMILY === 'Windows') {
                        exec($command . ' > NUL 2>&1', $output, $returnCode);
                    } else {
                        exec($command . ' 2>&1', $output, $returnCode);
                    }
                    if ($returnCode === 0) {
                        Log::info('Ghostscript verified at path', ['path' => $path]);
                        self::$cachedGhostscriptPath = '"' . $path . '"';
                        return '"' . $path . '"';
                    } else {
                        Log::warning('Ghostscript found but version check failed', [
                            'path' => $path,
                            'return_code' => $returnCode,
                            'output' => implode("\n", $output),
                        ]);
                    }
                }
            }

            // Try gswin64c and gswin32c in PATH
            Log::info('Checking Ghostscript in PATH (gswin64c)');
            exec('gswin64c --version > NUL 2>&1', $output, $returnCode);
            if ($returnCode === 0) {
                Log::info('Ghostscript found via gswin64c in PATH');
                self::$cachedGhostscriptPath = 'gswin64c';
                return 'gswin64c';
            }
            Log::info('Checking Ghostscript in PATH (gswin32c)');
            exec('gswin32c --version > NUL 2>&1', $output, $returnCode);
            if ($returnCode === 0) {
                Log::info('Ghostscript found via gswin32c in PATH');
                self::$cachedGhostscriptPath = 'gswin32c';
                return 'gswin32c';
            }
        }

        // Try standard command (works on Linux/Mac or if in PATH on Windows)
        Log::info('Checking Ghostscript in PATH (gs)');
        exec('gs --version 2>&1', $output, $returnCode);
        if ($returnCode === 0) {
            Log::info('Ghostscript found via gs in PATH');
            self::$cachedGhostscriptPath = 'gs';
            return 'gs';
        }

        Log::warning('Ghostscript not found');
        self::$cachedGhostscriptPath = ''; // Cache negative result
        return null;
    }

    /**
     * Convert PDF to image using Ghostscript
     */
    protected function convertPdfWithGhostscript(string $pdfPath, string $storagePath): ?array
    {
        try {
            $gsCommand = $this->getGhostscriptCommand();
            if (!$gsCommand) {
                Log::error('Ghostscript command not found');
                return null;
            }

            $imagePath = str_replace('.pdf', '.png', $storagePath);
            $imageFullPath = Storage::disk('public')->path($imagePath);

            // Use Ghostscript to convert first page to PNG
            $command = sprintf(
                '%s -dNOPAUSE -dBATCH -sDEVICE=png16m -r150 -dFirstPage=1 -dLastPage=1 -sOutputFile=%s %s',
                $gsCommand,
                escapeshellarg($imageFullPath),
                escapeshellarg($pdfPath)
            );

            Log::info('Executing Ghostscript command', ['command' => $command]);
            exec($command . ' 2>&1', $output, $returnCode);

            if ($returnCode !== 0) {
                Log::error('Ghostscript conversion failed', [
                    'command' => $command,
                    'output' => implode("\n", $output),
                    'return_code' => $returnCode,
                ]);
                return null;
            }

            if (!file_exists($imageFullPath)) {
                Log::error('Ghostscript output file not found', [
                    'expected_path' => $imageFullPath,
                    'output' => implode("\n", $output),
                ]);
                return null;
            }

            // Get dimensions
            $imageInfo = @getimagesize($imageFullPath);
            if (!$imageInfo) {
                Log::error('Failed to get image dimensions', ['path' => $imageFullPath]);
                return null;
            }

            // Delete original PDF
            Storage::disk('public')->delete($pdfPath);

            Log::info('Ghostscript conversion successful', [
                'image_path' => $imagePath,
                'width' => $imageInfo[0],
                'height' => $imageInfo[1],
            ]);

            return [
                'path' => $imagePath,
                'width' => $imageInfo[0],
                'height' => $imageInfo[1],
                'type' => 'image',
            ];
        } catch (\Exception $e) {
            Log::error('Ghostscript PDF conversion failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Handle DOCX files - convert to image
     */
    protected function handleDocx($file): ?array
    {
        // Store DOCX temporarily
        $docxPath = $file->store('certificate-templates/temp', 'public');
        $docxFullPath = Storage::disk('public')->path($docxPath);

        try {
            // Load DOCX using PHPWord
            Settings::setOutputEscapingEnabled(true);
            $phpWord = IOFactory::load($docxFullPath);

            // Convert to HTML
            $htmlWriter = IOFactory::createWriter($phpWord, 'HTML');
            $htmlPath = str_replace('.docx', '.html', $docxFullPath);
            $htmlWriter->save($htmlPath);

            // Convert HTML to image using a headless browser or renderer
            // For now, we'll use a simpler approach: render HTML to image
            // This requires wkhtmltopdf or similar tool, or we can use a service
            
            // Alternative: Use LibreOffice to convert DOCX to PDF, then PDF to image
            if ($this->hasLibreOffice()) {
                return $this->convertDocxViaLibreOffice($docxFullPath, $docxPath);
            }

            // Fallback: Cannot convert - return null so frontend knows conversion failed
            Log::warning('DOCX conversion not available - LibreOffice or conversion service required', [
                'docx_path' => $docxPath,
            ]);

            // Don't return the DOCX path - return null to indicate conversion failed
            // The original file will still be stored by the controller
            return null;
        } catch (\Exception $e) {
            Log::error('DOCX conversion failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return null to indicate conversion failed
            // The original file will still be stored by the controller
            return null;
        }
    }

    /**
     * Convert DOCX to PDF using LibreOffice, then PDF to image
     */
    protected function convertDocxViaLibreOffice(string $docxPath, string $storagePath): ?array
    {
        try {
            $libreOfficeCmd = $this->getLibreOfficeCommand();
            if (!$libreOfficeCmd) {
                Log::error('LibreOffice command not found');
                return null;
            }

            $pdfPath = str_replace('.docx', '.pdf', $docxPath);
            $outputDir = dirname($docxPath);

            // Convert DOCX to PDF using LibreOffice
            // On Windows, use full path; on Linux/Mac, use command name
            $command = sprintf(
                '%s --headless --convert-to pdf --outdir %s %s',
                $libreOfficeCmd,
                escapeshellarg($outputDir),
                escapeshellarg($docxPath)
            );

            Log::info('Executing LibreOffice command', ['command' => $command]);
            exec($command . ' 2>&1', $output, $returnCode);

            if ($returnCode !== 0) {
                Log::error('LibreOffice DOCX to PDF conversion failed', [
                    'command' => $command,
                    'output' => implode("\n", $output),
                    'return_code' => $returnCode,
                    'docx_path' => $docxPath,
                    'output_dir' => $outputDir,
                ]);
                return null;
            }

            if (!file_exists($pdfPath)) {
                Log::error('LibreOffice PDF output not found', [
                    'expected_path' => $pdfPath,
                    'output' => implode("\n", $output),
                    'output_dir_contents' => is_dir($outputDir) ? implode(', ', scandir($outputDir)) : 'not a directory',
                ]);
                return null;
            }

            Log::info('LibreOffice successfully converted DOCX to PDF', [
                'pdf_path' => $pdfPath,
                'pdf_size' => filesize($pdfPath),
            ]);

            // Now convert PDF to image
            $pdfStoragePath = str_replace('.docx', '.pdf', $storagePath);
            if (extension_loaded('imagick')) {
                Log::info('Converting PDF to image using Imagick');
                $result = $this->convertPdfWithImagick($pdfPath, $pdfStoragePath);
            } elseif ($this->hasGhostscript()) {
                Log::info('Converting PDF to image using Ghostscript');
                $result = $this->convertPdfWithGhostscript($pdfPath, $pdfStoragePath);
            } else {
                Log::error('PDF to image conversion failed - neither Imagick nor Ghostscript available', [
                    'pdf_path' => $pdfPath,
                    'pdf_exists' => file_exists($pdfPath),
                ]);
                $result = null;
            }

            // Clean up
            @unlink($docxPath);
            @unlink($pdfPath);

            return $result;
        } catch (\Exception $e) {
            Log::error('LibreOffice DOCX conversion failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Check if Ghostscript is available
     */
    protected function hasGhostscript(): bool
    {
        return $this->getGhostscriptCommand() !== null;
    }

    /**
     * Get LibreOffice command path
     */
    protected function getLibreOfficeCommand(): ?string
    {
        // Return cached result if available
        if (self::$cachedLibreOfficePath !== null) {
            return self::$cachedLibreOfficePath ?: null;
        }

        // Try standard command first (Linux/Mac)
        exec('libreoffice --headless --version 2>&1', $output, $returnCode);
        if ($returnCode === 0) {
            Log::info('LibreOffice found in PATH');
            self::$cachedLibreOfficePath = 'libreoffice';
            return 'libreoffice';
        }

        // On Windows, try soffice.exe
        if (PHP_OS_FAMILY === 'Windows') {
            // Try common Windows paths
            $possiblePaths = [
                'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
                'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            ];

            $programFiles = getenv('PROGRAMFILES');
            if ($programFiles) {
                $possiblePaths[] = $programFiles . '\\LibreOffice\\program\\soffice.exe';
            }

            $programFilesX86 = getenv('PROGRAMFILES(X86)');
            if ($programFilesX86) {
                $possiblePaths[] = $programFilesX86 . '\\LibreOffice\\program\\soffice.exe';
            }

            // Also check for different LibreOffice versions
            $libreOfficeVersions = ['LibreOffice 7', 'LibreOffice 6', 'LibreOffice 5'];
            foreach ($libreOfficeVersions as $version) {
                $possiblePaths[] = "C:\\Program Files\\{$version}\\program\\soffice.exe";
                $possiblePaths[] = "C:\\Program Files (x86)\\{$version}\\program\\soffice.exe";
                if ($programFiles) {
                    $possiblePaths[] = "{$programFiles}\\{$version}\\program\\soffice.exe";
                }
                if ($programFilesX86) {
                    $possiblePaths[] = "{$programFilesX86}\\{$version}\\program\\soffice.exe";
                }
            }

            Log::info('Checking LibreOffice paths on Windows', ['paths_count' => count($possiblePaths)]);

            foreach ($possiblePaths as $path) {
                if (file_exists($path)) {
                    Log::info('Found LibreOffice at path, testing', ['path' => $path]);
                    // Test if it works - use headless mode and suppress all output on Windows
                    // Redirect both stdout and stderr to NUL to prevent console popups
                    $command = '"' . $path . '" --headless --version';
                    if (PHP_OS_FAMILY === 'Windows') {
                        // On Windows, use start with /B flag to run in background, or redirect to NUL
                        exec($command . ' > NUL 2>&1', $output, $returnCode);
                    } else {
                        exec($command . ' 2>&1', $output, $returnCode);
                    }
                    if ($returnCode === 0) {
                        Log::info('LibreOffice verified at path', ['path' => $path]);
                        self::$cachedLibreOfficePath = '"' . $path . '"';
                        return '"' . $path . '"';
                    } else {
                        Log::warning('LibreOffice found but version check failed', [
                            'path' => $path,
                            'return_code' => $returnCode,
                        ]);
                    }
                }
            }

            // Try soffice in PATH
            exec('soffice --headless --version 2>&1', $output, $returnCode);
            if ($returnCode === 0) {
                Log::info('LibreOffice found via soffice in PATH');
                self::$cachedLibreOfficePath = 'soffice';
                return 'soffice';
            }
        }

        Log::warning('LibreOffice not found');
        self::$cachedLibreOfficePath = ''; // Cache negative result
        return null;
    }

    /**
     * Check if LibreOffice is available
     */
    protected function hasLibreOffice(): bool
    {
        return $this->getLibreOfficeCommand() !== null;
    }
}

