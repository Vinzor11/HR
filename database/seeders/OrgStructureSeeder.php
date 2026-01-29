<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrgStructureSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // 1) Sectors
            // Get or create Academic sector
            DB::table('sectors')->updateOrInsert(
                ['name' => 'Academic'],
                ['code' => 'ACAD', 'description' => 'Academic units (Colleges and Programs)', 'is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
            $academicSectorId = DB::table('sectors')->where('name', 'Academic')->value('id');

            // Get or create Administrative sector
            DB::table('sectors')->updateOrInsert(
                ['name' => 'Administrative'],
                ['code' => 'ADMIN', 'description' => 'Administrative units (Offices)', 'is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
            $adminSectorId = DB::table('sectors')->where('name', 'Administrative')->value('id');

            // 2) Academic: Colleges + Programs (College → Program)
            $colleges = [
                [
                    'name' => 'College of Agriculture',
                    'code' => 'COA',
                    'programs' => [
                        'DAS',
                        'Crop Science',
                        'Agricultural Extension & Communication',
                        'Soil Science',
                        'Animal Science',
                        'Crop Protection',
                        'Agricultural Economics & Marketing'
                    ]
                ],
                [
                    'name' => 'College of Arts & Social Sciences',
                    'code' => 'COASS',
                    'programs' => []
                ],
                [
                    'name' => 'College of Business Management and Accountancy',
                    'code' => 'COBMA',
                    'programs' => [
                        'Bachelor of Science in Accountancy (BSAcc)',
                        'Bachelor of Science in Accounting Information System (BSAIS)',
                        'Bachelor of Science in Business Administration (BSBA)',
                        'Bachelor of Science in Entrepreneurship (BSEntrep)'
                    ]
                ],
                [
                    'name' => 'College of Criminal Justice Education',
                    'code' => 'CCJE',
                    'programs' => [
                        'Bachelor of Science in Criminology (BSCrim)'
                    ]
                ],
                [
                    'name' => 'College of Computer Studies',
                    'code' => 'CCS',
                    'programs' => [
                        'Bachelor of Science in Computer Science (BSCS)',
                        'Bachelor of Science in Information Technology (BSIT)',
                        'Bachelor of Science in Entertainment and Multimedia Computing (BSEMC) - Digital Animation',
                        'Associate in Computer Technology (ACT)'
                    ]
                ],
                [
                    'name' => 'College of Fisheries & Aquatic Sciences',
                    'code' => 'CFAS',
                    'programs' => [
                        'Capture Fisheries',
                        'Aquaculture',
                        'Fisheries Extension',
                        'Post-harvest',
                        'Aquatic Resources and Ecology'
                    ]
                ],
                [
                    'name' => 'College of Hospitality Management',
                    'code' => 'CHM',
                    'programs' => [
                        'Bachelor of Science in Tourism Management (BSTM)',
                        'Bachelor of Science in Hospitality Management (BSHM)'
                    ]
                ],
                [
                    'name' => 'College of Engineering',
                    'code' => 'COE',
                    'programs' => [
                        'Bachelor of Science in Civil Engineering (BSCE)',
                        'Bachelor of Science in Electrical Engineering (BSEE)',
                        'Bachelor of Science in Computer Engineering (BSCpE)'
                    ]
                ],
                [
                    'name' => 'College of Education',
                    'code' => 'COED',
                    'programs' => [
                        'Bachelor of Elementary Education (BEED)',
                        'Bachelor of Secondary Education (BSED)',
                        'Bachelor of Early Childhood Education (BECED)'
                    ]
                ],
                [
                    'name' => 'College of Law',
                    'code' => 'COL',
                    'programs' => [
                        'Juris Doctor (JD)'
                    ]
                ],
                [
                    'name' => 'College of Nursing',
                    'code' => 'CON',
                    'programs' => [
                        'Bachelor of Science in Nursing Diploma (BSND)',
                        'Bachelor of Science in Nursing (BSN)',
                        'Diploma in Midwifery (DM)'
                    ]
                ],
                [
                    'name' => 'College of Technology',
                    'code' => 'COT',
                    'programs' => [
                        'Automotive Technology',
                        'Architectural Drafting Technology',
                        'Electrical Technology',
                        'Electronics Technology'
                    ]
                ],
                [
                    'name' => 'College of Science',
                    'code' => 'COS',
                    'programs' => [
                        'Bachelor of Science in Environmental Science',
                        'Bachelor of Science in Biology'
                    ]
                ],
                [
                    'name' => 'Graduate School',
                    'code' => 'GS',
                    'programs' => [
                        'PhD in Education',
                        'MA in Teaching Vocational Education',
                        'MA in Education',
                        'PhD in Animal Science',
                        'Master in Agricultural Science',
                        'MA in Management',
                        'PhD in Crop Science',
                        'MA in Engineering',
                        'MS in Criminal Justice Education'
                    ]
                ]
            ];

            foreach ($colleges as $college) {
                $code = $college['code'] ?? null;
                // Match by code (unique) when present to avoid duplicate key
                $match = array_filter([
                    'sector_id' => $academicSectorId,
                    'unit_type' => 'college',
                    'code' => $code,
                ], fn ($v) => $v !== null);
                if (empty($match)) {
                    $match = ['sector_id' => $academicSectorId, 'unit_type' => 'college', 'name' => $college['name']];
                }
                DB::table('units')->updateOrInsert(
                    $match,
                    [
                        'name' => $college['name'],
                        'code' => $code,
                        'parent_unit_id' => null,
                        'description' => null,
                        'is_active' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
                $collegeId = DB::table('units')->where('sector_id', $academicSectorId)
                    ->where('unit_type', 'college')
                    ->where($code ? 'code' : 'name', $code ?: $college['name'])
                    ->value('id');

                foreach (($college['programs'] ?? []) as $programName) {
                    DB::table('units')->updateOrInsert(
                        ['sector_id' => $academicSectorId, 'unit_type' => 'program', 'name' => $programName, 'parent_unit_id' => $collegeId],
                        [
                            'code' => null,
                            'description' => null,
                            'is_active' => true,
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                }
            }

            // 3) Administrative: Offices
            $offices = [
                ['name' => 'Accounting Office', 'code' => 'AO'],
                ['name' => 'Admission Services Office', 'code' => 'ASO'],
                ['name' => 'Admission, Registration & Records Office', 'code' => 'ARRO'],
                ['name' => 'Administrative and Support Services Office', 'code' => 'ASSO'],
                ['name' => 'Procurement Office', 'code' => 'PO'],
                ['name' => 'Bids and Awards Committee Office', 'code' => 'BACO'],
                ['name' => 'Budget Office', 'code' => 'BO'],
                ['name' => 'Office of the Chief Administrative Officer', 'code' => 'OCAO'],
                ['name' => 'Cashier\'s Office', 'code' => 'CO'],
                ['name' => 'Gender and Development Office', 'code' => 'GAD'],
                ['name' => 'Guidance and Counseling Services Office', 'code' => 'GCSO'],
                ['name' => 'Human Resource Management Office', 'code' => 'HRMO'],
                ['name' => 'Internal Control Office', 'code' => 'ICO'],
                ['name' => 'Information and Communication Technology Center', 'code' => 'ICTC'],
                ['name' => 'Income Generating Project Office', 'code' => 'IGP'],
                ['name' => 'University Infirmary', 'code' => 'UI'],
                ['name' => 'Infrastructure Projects Development Engineering Services Office', 'code' => 'IPDESO'],
                ['name' => 'Institutional Planning & Development Office', 'code' => 'IPDO'],
                ['name' => 'Intellectual Property Office of the University', 'code' => 'IPOU'],
                ['name' => 'Innovation and Technology Support Office', 'code' => 'ITSO'],
                ['name' => 'Knowledge and Technology Transfer Office', 'code' => 'KTTO'],
                ['name' => 'Knowledge Management Office', 'code' => 'KMO'],
                ['name' => 'Legal Aid Clinic', 'code' => 'LAC'],
                ['name' => 'Legal Office', 'code' => 'LO'],
                ['name' => 'University Library', 'code' => 'UL'],
                ['name' => 'Motorpool & Transportation Services Office', 'code' => 'MTSO'],
                ['name' => 'National Service Training Program Office', 'code' => 'NSTP'],
                ['name' => 'Office of the University President', 'code' => 'OUP'],
                ['name' => 'Office of the Vice President for Research, Extension and Innovation', 'code' => 'OVPREI'],
                ['name' => 'Office of the Vice President for External Affairs & Quality Assurance', 'code' => 'OVPEAQA'],
                ['name' => 'Physical Plant and Facilities Office', 'code' => 'PPFO'],
                ['name' => 'Public Relations & Information Management Office', 'code' => 'PRIMO'],
                ['name' => 'Quality Assurance and Accreditation Center', 'code' => 'QAAC'],
                ['name' => 'Research and Development Services Office', 'code' => 'RDSO'],
                ['name' => 'Registrar\'s Office', 'code' => 'RO'],
                ['name' => 'Records Management Office', 'code' => 'RMO'],
                ['name' => 'Supply and Property Management Office', 'code' => 'SPMO'],
                ['name' => 'Sports and Physical Fitness Office', 'code' => 'SPFO'],
                ['name' => 'Training and Extension Service Office', 'code' => 'TESO'],
                ['name' => 'University Disaster Risk Reduction and Management Office', 'code' => 'UDRRMO'],
                ['name' => 'Utilities and Equipment Services Office', 'code' => 'UESO'],
            ];

            foreach ($offices as $office) {
                $code = $office['code'] ?? null;
                // Match by code (unique) when present to avoid duplicate key
                $match = array_filter([
                    'sector_id' => $adminSectorId,
                    'unit_type' => 'office',
                    'code' => $code,
                ], fn ($v) => $v !== null);
                if (empty($match)) {
                    $match = ['sector_id' => $adminSectorId, 'unit_type' => 'office', 'name' => $office['name']];
                }
                DB::table('units')->updateOrInsert(
                    $match,
                    [
                        'name' => $office['name'],
                        'code' => $code,
                        'parent_unit_id' => null,
                        'description' => null,
                        'is_active' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        });
    }
}
