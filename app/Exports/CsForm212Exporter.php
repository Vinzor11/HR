<?php

namespace App\Exports;

use App\Models\Employee;
use Illuminate\Support\Arr;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use RuntimeException;

class CsForm212Exporter
{
    private array $mapping;

    private string $defaultSheet;

    public function __construct(array $mapping = [])
    {
        $this->mapping = $mapping ?: config('pds_map', []);
        $this->defaultSheet = $this->mapping['default_sheet'] ?? 'C1';
    }

    /**
     * Load the CS Form 212 template or create a blank spreadsheet.
     */
    private function loadSpreadsheet(): Spreadsheet
    {
        $templatePath = $this->mapping['template_path'] ?? null;
        if ($templatePath) {
            $fullPath = str_starts_with($templatePath, DIRECTORY_SEPARATOR) || preg_match('#^[A-Za-z]:#', $templatePath)
                ? $templatePath
                : storage_path($templatePath);
            if (is_file($fullPath) && is_readable($fullPath)) {
                try {
                    return IOFactory::load($fullPath);
                } catch (\Throwable $e) {
                    \Log::warning('CS Form 212 template could not be loaded, using blank sheet', [
                        'path' => $fullPath,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
        $spreadsheet = new Spreadsheet();
        $this->ensureSheets($spreadsheet);
        return $spreadsheet;
    }

    /**
     * Build an XLSX file with employee data in CS Form 212 structure and return the file path.
     * Uses the official template (CS Form No. 212 Personal Data Sheet revised.xlsx) when available.
     */
    public function export(Employee $employee): string
    {
        $employee->load([
            'familyBackground',
            'children',
            'educationalBackground',
            'civilServiceEligibility',
            'workExperience',
            'voluntaryWork',
            'learningDevelopment',
            'otherInformation',
            'questionnaire',
            'references',
            'primaryDesignation.position',
            'primaryDesignation.unit',
        ]);

        $spreadsheet = $this->loadSpreadsheet();
        if ($spreadsheet->getSheetCount() < 4) {
            $this->ensureSheets($spreadsheet);
        }

        $this->writeSingleFields($spreadsheet, $employee);
        $this->writeFamilyBackground($spreadsheet, $employee);
        $this->writeChildren($spreadsheet, $employee);
        $this->writeRepeatingSection($spreadsheet, 'educational_background', $employee->educationalBackground->toArray());
        $this->writeRepeatingSection($spreadsheet, 'civil_service_eligibility', $employee->civilServiceEligibility->toArray());
        $workExperienceRows = $this->buildWorkExperienceWithDesignation($employee);
        $this->writeRepeatingSection($spreadsheet, 'work_experience', $workExperienceRows);
        $this->writeRepeatingSection($spreadsheet, 'voluntary_work', $this->mapVoluntaryWork($employee->voluntaryWork));
        $this->writeRepeatingSection($spreadsheet, 'learning_development', $this->mapLearningDevelopment($employee->learningDevelopment));
        $this->writeReferences($spreadsheet, $employee);
        $this->writeOtherInformation($spreadsheet, $employee);
        $this->writeQuestionnaire($spreadsheet, $employee);

        $tempPath = storage_path('app/temp/cs_form_212_export_' . $employee->id . '_' . uniqid() . '.xlsx');
        $dir = dirname($tempPath);
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0755, true)) {
                throw new RuntimeException('Could not create temp directory for export.');
            }
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);
        $spreadsheet->disconnectWorksheets();

        return $tempPath;
    }

    /**
     * Build work experience rows with current designation (primary) first for CS Form 212 export.
     */
    private function buildWorkExperienceWithDesignation(Employee $employee): array
    {
        $rows = [];
        $primary = $employee->primaryDesignation;
        if ($primary) {
            $from = $primary->start_date ?? $employee->date_hired;
            $to = $primary->end_date;
            $rows[] = [
                'date_from' => $from ? ($from instanceof \DateTimeInterface ? $from->format('Y-m-d') : \Carbon\Carbon::parse((string) $from)->format('Y-m-d')) : null,
                'date_to' => $to ? ($to instanceof \DateTimeInterface ? $to->format('Y-m-d') : \Carbon\Carbon::parse((string) $to)->format('Y-m-d')) : null,
                'position_title' => $primary->position?->pos_name ?? 'N/A',
                'company_name' => 'Eastern Samar State University (Main Campus)',
                'monthly_salary' => $employee->salary,
                'salary_grade_step' => null,
                'status_of_appointment' => $employee->employment_status,
                'is_gov_service' => true,
            ];
        }
        foreach ($employee->workExperience->toArray() as $exp) {
            $rows[] = $exp;
        }
        return $rows;
    }

    /**
     * Set cell value and apply consistent font (size 11, not bold).
     * Enables shrink-to-fit so text scales down when the cell is too small.
     */
    private function setCellValueWithStyle(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $coordinate, mixed $value): void
    {
        $sheet->setCellValue($coordinate, $value);
        $style = $sheet->getStyle($coordinate);
        $style->getFont()->setSize(11);
        $style->getFont()->setBold(false);
        $style->getAlignment()->setShrinkToFit(true);
    }

    private function ensureSheets(Spreadsheet $spreadsheet): void
    {
        $sheetNames = ['C1', 'C2', 'C3', 'C4'];
        $existing = $spreadsheet->getSheetCount();
        for ($i = 0; $i < count($sheetNames); $i++) {
            if ($i < $existing) {
                $spreadsheet->getSheet($i)->setTitle($sheetNames[$i]);
            } else {
                $spreadsheet->createSheet()->setTitle($sheetNames[$i]);
            }
        }
    }

    /** Map pds_map sheet names (C1, C2, C3, C4) to 0-based index for templates that use different names. */
    private const SHEET_INDEX = ['C1' => 0, 'C2' => 1, 'C3' => 2, 'C4' => 3];

    private function getSheet(Spreadsheet $spreadsheet, string $sheetName): \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet
    {
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            if ($sheet->getTitle() === $sheetName) {
                return $sheet;
            }
        }
        $index = self::SHEET_INDEX[$sheetName] ?? 0;
        $count = $spreadsheet->getSheetCount();
        if ($index < $count) {
            return $spreadsheet->getSheet($index);
        }
        return $spreadsheet->getSheet(0);
    }

    private function writeSingleFields(Spreadsheet $spreadsheet, Employee $employee): void
    {
        $singleFields = $this->mapping['single_fields'] ?? [];
        foreach ($singleFields as $field => $definition) {
            $definition = $this->normalizeSingleDefinition($definition);
            $value = $employee->{$field};
            if ($value === null || $value === '') {
                continue;
            }
            if ($definition['type'] === 'date' && $value instanceof \DateTimeInterface) {
                $value = $value->format('Y-m-d');
            }
            if (is_bool($value)) {
                $value = $value ? 'Y' : 'N';
            }
            $sheet = $this->getSheet($spreadsheet, $definition['sheet']);
            $this->setCellValueWithStyle($sheet, $definition['cell'], $value);
        }
    }

    private function writeFamilyBackground(Spreadsheet $spreadsheet, Employee $employee): void
    {
        $configs = $this->mapping['family_background'] ?? [];
        $byRelation = $employee->familyBackground->keyBy('relation');

        foreach ($configs as $definition) {
            $relation = $definition['relation'] ?? null;
            $sheetName = $definition['sheet'] ?? $this->defaultSheet;
            $cells = $definition['cells'] ?? [];
            if (!$relation || empty($cells)) {
                continue;
            }
            $member = $byRelation->get($relation);
            if (!$member) {
                continue;
            }
            $member = $member instanceof \Illuminate\Database\Eloquent\Model ? $member->toArray() : (array) $member;
            $sheet = $this->getSheet($spreadsheet, $sheetName);
            foreach ($cells as $field => $cell) {
                $value = $member[$field] ?? null;
                if ($value !== null && $value !== '') {
                    $this->setCellValueWithStyle($sheet, $cell, $value);
                }
            }
        }
    }

    private function writeChildren(Spreadsheet $spreadsheet, Employee $employee): void
    {
        $config = $this->mapping['children'] ?? null;
        if (!$config || empty($config['columns'])) {
            return;
        }
        $sheetName = $config['sheet'] ?? $this->defaultSheet;
        $startRow = (int) ($config['start_row'] ?? 0);
        $endRow = (int) ($config['end_row'] ?? 0);
        $sheet = $this->getSheet($spreadsheet, $sheetName);
        $children = $employee->children->toArray();
        $row = $startRow;
        foreach ($children as $index => $child) {
            if ($row > $endRow) {
                break;
            }
            foreach ($config['columns'] as $field => $colDef) {
                $colDef = is_array($colDef) ? $colDef : ['column' => $colDef];
                $column = strtoupper($colDef['column'] ?? $colDef['columns'][0] ?? 'A');
                $value = $child[$field] ?? null;
                if ($value instanceof \DateTimeInterface) {
                    $value = $value->format('Y-m-d');
                }
                if ($value !== null && $value !== '') {
                    $this->setCellValueWithStyle($sheet, $column . $row, $value);
                }
            }
            $row++;
        }
    }

    private function writeRepeatingSection(Spreadsheet $spreadsheet, string $sectionKey, array $rows): void
    {
        $config = Arr::get($this->mapping, "repeating_sections.{$sectionKey}");
        if (!$config || empty($config['columns'])) {
            return;
        }
        $sheetName = $config['sheet'] ?? $this->defaultSheet;
        $startRow = (int) ($config['start_row'] ?? 0);
        $endRow = (int) ($config['end_row'] ?? 0);
        $columns = $config['columns'];
        $sheet = $this->getSheet($spreadsheet, $sheetName);
        $currentRow = $startRow;
        foreach ($rows as $record) {
            if ($currentRow > $endRow) {
                break;
            }
            foreach ($columns as $colField => $colDef) {
                $colDef = is_array($colDef) ? $colDef : ['column' => $colDef];
                $colLetters = $colDef['columns'] ?? [$colDef['column'] ?? 'A'];
                if (!is_array($colLetters)) {
                    $colLetters = [$colLetters];
                }
                $column = strtoupper($colLetters[0]);
                $value = $record[$colField] ?? null;
                if ($value === null) {
                    continue;
                }
                if ($value instanceof \DateTimeInterface) {
                    $value = $value->format('Y-m-d');
                }
                if (is_bool($value)) {
                    $value = $value ? 'Y' : 'N';
                }
                if ((string) $value !== '') {
                    $this->setCellValueWithStyle($sheet, $column . $currentRow, $value);
                }
            }
            $currentRow++;
        }
    }

    private function mapVoluntaryWork($collection): array
    {
        return $collection->map(function ($item) {
            $a = $item instanceof \Illuminate\Database\Eloquent\Model ? $item->toArray() : (array) $item;
            return [
                'organization_name' => $a['organization_name'] ?? null,
                'date_from' => $a['date_from'] ?? null,
                'date_to' => $a['date_to'] ?? null,
                'hours_rendered' => $a['hours_rendered'] ?? null,
                'position_or_nature' => $a['position_or_nature'] ?? null,
            ];
        })->toArray();
    }

    private function mapLearningDevelopment($collection): array
    {
        return $collection->map(function ($item) {
            $a = $item instanceof \Illuminate\Database\Eloquent\Model ? $item->toArray() : (array) $item;
            return [
                'title' => $a['title'] ?? null,
                'date_from' => $a['date_from'] ?? null,
                'date_to' => $a['date_to'] ?? null,
                'hours' => $a['hours'] ?? null,
                'type_of_ld' => $a['type_of_ld'] ?? null,
                'conducted_by' => $a['conducted_by'] ?? null,
            ];
        })->toArray();
    }

    private function writeReferences(Spreadsheet $spreadsheet, Employee $employee): void
    {
        $config = Arr::get($this->mapping, 'repeating_sections.references');
        if (!$config || empty($config['columns'])) {
            return;
        }
        $sheetName = $config['sheet'] ?? $this->defaultSheet;
        $startRow = (int) ($config['start_row'] ?? 0);
        $endRow = (int) ($config['end_row'] ?? 0);
        $sheet = $this->getSheet($spreadsheet, $sheetName);
        $refs = $employee->references->toArray();
        $currentRow = $startRow;
        foreach ($refs as $ref) {
            if ($currentRow > $endRow) {
                break;
            }
            $name = trim(implode(' ', array_filter([
                $ref['first_name'] ?? '',
                $ref['middle_initial'] ?? '',
                $ref['surname'] ?? '',
            ])));
            $this->setCellValueWithStyle($sheet, 'A' . $currentRow, $name);
            if (!empty($ref['address'])) {
                $this->setCellValueWithStyle($sheet, 'F' . $currentRow, $ref['address']);
            }
            if (!empty($ref['telephone_no'])) {
                $this->setCellValueWithStyle($sheet, 'G' . $currentRow, $ref['telephone_no']);
            }
            $currentRow++;
        }
    }

    private function writeOtherInformation(Spreadsheet $spreadsheet, Employee $employee): void
    {
        $config = $this->mapping['other_information'] ?? [];
        if (empty($config)) {
            return;
        }
        $sheetName = $config['sheet'] ?? $this->defaultSheet;
        $sheet = $this->getSheet($spreadsheet, $sheetName);
        $other = $employee->otherInformation;
        if (!$other) {
            return;
        }
        $other = $other->toArray();
        foreach (['skill_or_hobby', 'non_academic_distinctions', 'memberships'] as $field) {
            $rangeDef = $config[$field] ?? null;
            if (!$rangeDef || !isset($rangeDef['column'], $rangeDef['start_row'])) {
                continue;
            }
            $value = $other[$field] ?? null;
            if ($value === null || (string) $value === '') {
                continue;
            }
            $column = strtoupper($rangeDef['column']);
            $startRow = (int) $rangeDef['start_row'];
            $endRow = (int) ($rangeDef['end_row'] ?? $startRow);
            $lines = preg_split('/\r\n|\r|\n/', trim($value));
            $row = $startRow;
            foreach ($lines as $line) {
                if ($row > $endRow) {
                    break;
                }
                $this->setCellValueWithStyle($sheet, $column . $row, trim($line));
                $row++;
            }
        }
    }

    private function writeQuestionnaire(Spreadsheet $spreadsheet, Employee $employee): void
    {
        $configs = $this->mapping['questionnaire'] ?? [];
        if (empty($configs)) {
            return;
        }
        $byNumber = $employee->questionnaire->keyBy('question_number');
        foreach ($configs as $questionKey => $cells) {
            $questionNumber = is_numeric($questionKey) ? (int) $questionKey : null;
            if ($questionNumber === null) {
                continue;
            }
            $entry = $byNumber->get($questionNumber);
            $sheetName = $cells['sheet'] ?? $this->defaultSheet;
            $sheet = $this->getSheet($spreadsheet, $sheetName);
            $answer = $entry ? (bool) $entry->answer : false;
            $details = $entry && !empty($entry->details) ? trim($entry->details) : '';
            if (!empty($cells['answer_cell'])) {
                // Use TRUE/FALSE so Excel checkboxes linked to this cell show as checked/unchecked
                $this->setCellValueWithStyle($sheet, $cells['answer_cell'], $answer);
            }
            if (!empty($cells['details_cell']) && $details !== '') {
                $this->setCellValueWithStyle($sheet, $cells['details_cell'], $details);
            }
        }
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
}
