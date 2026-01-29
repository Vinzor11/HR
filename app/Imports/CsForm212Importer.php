<?php

namespace App\Imports;

use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use RuntimeException;

class CsForm212Importer
{
    private array $mapping;

    private string $defaultSheet;

    public function __construct(array $mapping = [])
    {
        $this->mapping = $mapping ?: config('pds_map', []);
        $this->defaultSheet = $this->mapping['default_sheet'] ?? 'C1';
    }

    /**
     * Extracts all mapped values from the uploaded CS Form 212 file.
     */
    public function extract(UploadedFile|string $file): array
    {
        $sheets = $this->loadSheets($file);

        $payload = $this->extractSingleFields($sheets);

        if ($family = $this->extractFamilyBackground($sheets)) {
            $payload['family_background'] = $family;
        }

        if ($children = $this->extractTable($sheets, Arr::get($this->mapping, 'children', []))) {
            $payload['children'] = $children;
        }

        foreach (['educational_background', 'civil_service_eligibility', 'work_experience', 'voluntary_work', 'learning_development'] as $section) {
            $table = $this->extractTable($sheets, Arr::get($this->mapping, "repeating_sections.{$section}", []));
            if (!empty($table)) {
                $payload[$section] = $table;
            }
        }

        if ($references = $this->extractReferences($sheets)) {
            $payload['references'] = $references;
        }

        if ($otherInfo = $this->extractOtherInformation($sheets)) {
            $payload['other_information'] = $otherInfo;
        }

        // Always include questionnaire data (even if empty array)
        $questionnaire = $this->extractQuestionnaire($sheets);
        if (!empty($questionnaire)) {
            $payload['questionnaire'] = $questionnaire;
            \Log::info('Questionnaire data extracted', ['questionnaire' => $questionnaire]);
        } else {
            \Log::warning('No questionnaire data extracted from CS Form 212');
        }

        return $payload;
    }

    private function loadSheets(UploadedFile|string $file): array
    {
        $path = $file instanceof UploadedFile ? $file->getRealPath() : $file;

        if (!$path || !file_exists($path)) {
            throw new RuntimeException('Unable to read the uploaded CS Form 212 file.');
        }

        // Verify file is readable and not empty
        if (!is_readable($path)) {
            throw new RuntimeException('The uploaded file is not readable. Please check file permissions.');
        }

        $fileSize = filesize($path);
        if ($fileSize === 0) {
            throw new RuntimeException('The uploaded file is empty.');
        }

        try {
            // Try to determine file type and use appropriate reader
            $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            
            // Verify file before attempting to load
            if (!file_exists($path)) {
                throw new RuntimeException('File does not exist at path: ' . $path);
            }
            
            if (!is_readable($path)) {
                throw new RuntimeException('File is not readable at path: ' . $path);
            }
            
            $actualFileSize = filesize($path);
            if ($actualFileSize === 0) {
                throw new RuntimeException('File is empty (0 bytes) at path: ' . $path);
            }
            
            // Log file details before attempting to load
            \Log::info('Attempting to load Excel file', [
                'path' => $path,
                'extension' => $extension,
                'file_size' => $actualFileSize,
                'is_readable' => is_readable($path),
                'file_exists' => file_exists($path),
            ]);
            
            // Try to load with explicit reader for better error messages
            try {
                if ($extension === 'xlsx') {
                    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
                    // Set reader options to handle potential issues
                    $reader->setReadDataOnly(false);
                    $reader->setReadEmptyCells(true);
                    $spreadsheet = $reader->load($path);
                } elseif ($extension === 'xls') {
                    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xls');
                    $reader->setReadDataOnly(false);
                    $reader->setReadEmptyCells(true);
                    $spreadsheet = $reader->load($path);
                } else {
                    // Fallback to auto-detect
                    $spreadsheet = IOFactory::load($path);
                }
            } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $readerException) {
                // Log the actual PhpSpreadsheet error with full details
                \Log::error('PhpSpreadsheet Reader Exception (detailed)', [
                    'path' => $path,
                    'error' => $readerException->getMessage(),
                    'exception_class' => get_class($readerException),
                    'file_size' => $actualFileSize,
                    'file_exists' => file_exists($path),
                    'is_readable' => is_readable($path),
                    'previous_exception' => $readerException->getPrevious() ? get_class($readerException->getPrevious()) . ': ' . $readerException->getPrevious()->getMessage() : null,
                    'trace' => $readerException->getTraceAsString(),
                ]);
                
                // Re-throw with the original message for more specific error handling
                throw $readerException;
            }
        } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
            // This catches the re-thrown exception from above
            \Log::error('PhpSpreadsheet Reader Exception in loadSheets', [
                'path' => $path,
                'error' => $e->getMessage(),
                'exception_class' => get_class($e),
                'file_size' => filesize($path),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Provide more specific error message based on the exception
            $errorMessage = $e->getMessage();
            if (str_contains($errorMessage, 'simplexml_load_string') || str_contains($errorMessage, 'Document is empty')) {
                $errorMessage = 'The Excel file appears to be corrupted or incomplete. Please try re-saving the file in Excel and upload again.';
            } elseif (str_contains($errorMessage, 'password') || str_contains($errorMessage, 'encrypted')) {
                $errorMessage = 'The Excel file is password-protected. Please remove the password and try again.';
            } elseif (str_contains($errorMessage, 'zip') || str_contains($errorMessage, 'archive')) {
                $errorMessage = 'The Excel file structure is invalid. Please ensure it is a valid .xlsx or .xls file.';
            }
            
            throw new RuntimeException('Unable to read the Excel file: ' . $errorMessage);
        } catch (\Throwable $e) {
            \Log::error('General Exception in loadSheets', [
                'path' => $path,
                'error' => $e->getMessage(),
                'exception_class' => get_class($e),
                'file_size' => filesize($path),
                'trace' => $e->getTraceAsString(),
            ]);
            throw new RuntimeException('An error occurred while reading the file: ' . $e->getMessage());
        }

        $sheets = [];

        try {
            foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                $rows = $worksheet->toArray(null, true, true, true);
                $sheets[$worksheet->getTitle()] = $this->indexSheet($rows);
            }
        } catch (\Throwable $e) {
            throw new RuntimeException('An error occurred while processing the worksheet data: ' . $e->getMessage());
        }

        if (empty($sheets)) {
            throw new RuntimeException('The uploaded CS Form 212 file does not contain any readable sheets.');
        }

        return $sheets;
    }

    private function indexSheet(array $rows): array
    {
        $indexed = [];

        foreach ($rows as $rowNumber => $row) {
            if (!is_array($row)) {
                continue;
            }

            $rowIndex = (int) $rowNumber;

            foreach ($row as $columnLetter => $value) {
                if (is_numeric($columnLetter)) {
                    continue;
                }

                $indexed[$rowIndex][strtoupper($columnLetter)] = $value;
            }
        }

        return $indexed;
    }

    private function extractSingleFields(array $sheets): array
    {
        $result = [];

        foreach ($this->mapping['single_fields'] ?? [] as $field => $definition) {
            $definition = $this->normalizeSingleDefinition($definition);
            $value = $this->getCellValue($sheets, $definition['cell'], $definition['sheet']);
            $casted = $this->castValue($value, $definition['type']);

            if ($casted === null || $casted === '') {
                continue;
            }

            $result[$field] = $casted;
        }

        return $result;
    }

    private function extractFamilyBackground(array $sheets): array
    {
        $family = [];

        foreach ($this->mapping['family_background'] ?? [] as $definition) {
            $sheetName = $definition['sheet'] ?? $this->defaultSheet;

            $person = [
                'relation' => $definition['relation'] ?? 'Unknown',
                'surname' => '',
                'first_name' => '',
                'middle_name' => '',
                'name_extension' => '',
                'occupation' => '',
                'employer' => '',
                'business_address' => '',
                'telephone_no' => '',
            ];

            foreach ($definition['cells'] ?? [] as $field => $cell) {
                $value = $this->castValue($this->getCellValue($sheets, $cell, $sheetName), 'string');
                if ($value !== null) {
                    $person[$field] = $value;
                }
            }

            $hasValues = collect($person)
                ->except('relation')
                ->filter(fn ($value) => !$this->isBlank($value))
                ->isNotEmpty();

            if ($hasValues) {
                $family[] = $person;
            }
        }

        return $family;
    }

    private function extractTable(array $sheets, ?array $config): array
    {
        if (empty($config) || empty($config['columns'])) {
            return [];
        }

        $sheetName = $config['sheet'] ?? $this->defaultSheet;
        $rows = [];
        $start = (int) ($config['start_row'] ?? 0);
        $end = (int) ($config['end_row'] ?? 0);

        if ($start <= 0 || $end <= 0 || $end < $start) {
            return [];
        }

        for ($rowNumber = $start; $rowNumber <= $end; $rowNumber++) {
            $record = [];

            foreach ($config['columns'] as $field => $definition) {
                $columnDefinition = $this->normalizeColumnDefinition($definition);
                $cellValue = null;

                foreach ($columnDefinition['columns'] as $columnLetter) {
                    $candidate = $this->getCellValue($sheets, $columnLetter . $rowNumber, $sheetName);

                    if (!$this->isBlank($candidate)) {
                        $cellValue = $candidate;
                        break;
                    }
                }

                $record[$field] = $this->castValue($cellValue, $columnDefinition['type']);
            }

            $hasRequired = true;
            if (!empty($config['required'])) {
                $hasRequired = false;
                foreach ($config['required'] as $requiredField) {
                    if (! $this->isBlank($record[$requiredField] ?? null)) {
                        $hasRequired = true;
                        break;
                    }
                }
            }

            $hasAnyValue = false;
            foreach ($record as $value) {
                if (! $this->isBlank($value)) {
                    $hasAnyValue = true;
                    break;
                }
            }

            if ($hasRequired && $hasAnyValue) {
                $rows[] = $record;
            }
        }

        return $rows;
    }

    private function extractReferences(array $sheets): array
    {
        $rows = $this->extractTable($sheets, Arr::get($this->mapping, 'repeating_sections.references', []));
        if (empty($rows)) {
            return [];
        }

        return array_map(function (array $row) {
            return [
                'fullname' => trim($row['name'] ?? ''),
                'address' => $row['address'] ?? '',
                'telephone_no' => $row['telephone_no'] ?? '',
            ];
        }, $rows);
    }

    private function extractOtherInformation(array $sheets): array
    {
        $config = $this->mapping['other_information'] ?? [];
        if (empty($config)) {
            return [];
        }

        $sheetName = $config['sheet'] ?? $this->defaultSheet;
        $result = [];
        foreach ($config as $field => $definition) {
            if ($field === 'sheet') {
                continue;
            }

            $definition = $this->normalizeRangeDefinition($definition);
            $values = [];

            for ($row = $definition['start_row']; $row <= $definition['end_row']; $row++) {
                $value = $this->castValue($this->getCellValue($sheets, $definition['column'] . $row, $sheetName), 'string');
                if (! $this->isBlank($value)) {
                    $values[] = $value;
                }
            }

            if (!empty($values)) {
                $result[$field] = implode("\n", $values);
            }
        }

        return $result;
    }

    private function extractQuestionnaire(array $sheets): array
    {
        $config = $this->mapping['questionnaire'] ?? [];
        if (empty($config)) {
            return [];
        }

        $entries = [];

        foreach ($config as $questionNumber => $cells) {
            $sheetName = $cells['sheet'] ?? $this->defaultSheet;
            $answerRaw = $this->getCellValue($sheets, $cells['answer_cell'] ?? null, $sheetName);
            $detailsRaw = $this->getCellValue($sheets, $cells['details_cell'] ?? null, $sheetName);

            // Log for debugging
            \Log::debug('Questionnaire extraction', [
                'question_number' => $questionNumber,
                'answer_cell' => $cells['answer_cell'] ?? null,
                'details_cell' => $cells['details_cell'] ?? null,
                'answer_raw' => $answerRaw,
                'answer_raw_type' => gettype($answerRaw),
                'details_raw' => $detailsRaw,
                'details_raw_type' => gettype($detailsRaw),
            ]);

            // Consider answer as YES (true) if:
            // 1. The answer cell has any value (checkmark, X, etc.), OR
            // 2. The details cell has any value (user provided details means they answered YES)
            $hasAnswerInCell = !$this->isBlank($answerRaw);
            $hasDetails = !$this->isBlank($detailsRaw);
            $isYes = $hasAnswerInCell || $hasDetails;
            
            \Log::debug('Questionnaire answer computed', [
                'question_number' => $questionNumber,
                'hasAnswerInCell' => $hasAnswerInCell,
                'hasDetails' => $hasDetails,
                'isYes' => $isYes,
            ]);
            
            $entries[] = [
                'question_number' => (int) $questionNumber,
                'answer' => (bool) $isYes, // Explicitly cast to boolean - true if answer cell OR details has value
                'details' => $detailsRaw ? trim((string) $detailsRaw) : '',
            ];
        }

        return $entries;
    }

    private function getCellValue(array $sheets, ?string $coordinate, ?string $sheetName = null): mixed
    {
        if (!$coordinate) {
            return null;
        }

        $sheetKey = $sheetName ?? $this->defaultSheet;
        $sheet = $sheets[$sheetKey] ?? null;

        if (!$sheet || !preg_match('/^([A-Z]+)(\d+)$/i', strtoupper($coordinate), $matches)) {
            return null;
        }

        $column = strtoupper($matches[1]);
        $row = (int) $matches[2];

        return $sheet[$row][$column] ?? null;
    }

    private function normalizeSingleDefinition(string|array $definition): array
    {
        if (is_string($definition)) {
            $definition = ['cell' => $definition];
        }

        return [
            'sheet' => $definition['sheet'] ?? $this->defaultSheet,
            'cell' => strtoupper($definition['cell'] ?? ''),
            'type' => $definition['type'] ?? 'string',
        ];
    }

    private function normalizeColumnDefinition(string|array $definition): array
    {
        if (is_string($definition)) {
            $definition = ['column' => $definition];
        }

        $columns = $definition['columns'] ?? $definition['column'] ?? [];
        $columns = is_array($columns) ? $columns : [$columns];
        $columns = array_map(fn ($col) => strtoupper((string) $col), $columns);

        return [
            'columns' => array_values(array_filter($columns)),
            'type' => $definition['type'] ?? 'string',
        ];
    }

    private function normalizeRangeDefinition(array $definition): array
    {
        return [
            'column' => strtoupper($definition['column'] ?? 'A'),
            'start_row' => (int) ($definition['start_row'] ?? 0),
            'end_row' => (int) ($definition['end_row'] ?? 0),
        ];
    }

    private function castValue(mixed $value, string $type): mixed
    {
        if ($type === 'boolean') {
            return $this->castToBoolean($value);
        }

        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $value = trim($value);
        }

        if ($value === '') {
            return null;
        }

        return match ($type) {
            'date' => $this->formatDate($value),
            'numeric' => is_numeric($value) ? (string) $value : $value,
            default => is_string($value) ? $value : (string) $value,
        };
    }

    private function formatDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $value)->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function castToBoolean(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if ($value === null) {
            return false;
        }

        if (is_numeric($value)) {
            return (bool) $value;
        }

        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['y', 'yes', 'true', '1', 'x', '✓'], true);
    }

    private function splitName(?string $value): array
    {
        $value = trim((string) $value);
        if ($value === '') {
            return ['', '', ''];
        }

        $surname = '';
        $rest = $value;

        if (str_contains($value, ',')) {
            [$surname, $rest] = array_map('trim', explode(',', $value, 2));
        }

        $parts = preg_split('/\s+/', $rest);
        $firstName = array_shift($parts) ?? '';
        $middleInitial = '';

        if (!empty($parts)) {
            $middleInitial = strtoupper(substr($parts[0], 0, 1));
        }

        return [$firstName, $middleInitial, $surname];
    }

    private function isBlank(mixed $value): bool
    {
        if ($value === null) {
            return true;
        }

        if (is_string($value)) {
            return trim($value) === '';
        }

        return false;
    }
}

