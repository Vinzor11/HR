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

        if ($questionnaire = $this->extractQuestionnaire($sheets)) {
            $payload['questionnaire'] = $questionnaire;
        }

        return $payload;
    }

    private function loadSheets(UploadedFile|string $file): array
    {
        $path = $file instanceof UploadedFile ? $file->getRealPath() : $file;

        if (!$path || !file_exists($path)) {
            throw new RuntimeException('Unable to read the uploaded CS Form 212 file.');
        }

        $spreadsheet = IOFactory::load($path);
        $sheets = [];

        foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
            $rows = $worksheet->toArray(null, true, true, true);
            $sheets[$worksheet->getTitle()] = $this->indexSheet($rows);
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

            $entries[] = [
                'question_number' => (int) $questionNumber,
                'answer' => $this->castToBoolean($answerRaw),
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

