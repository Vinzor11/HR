<?php

namespace Tests\Feature\Requests;

use App\Models\RequestApprovalAction;
use App\Models\RequestSubmission;
use App\Models\RequestType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class DynamicRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    protected function ensurePermission(string $name): Permission
    {
        return Permission::firstOrCreate(
            ['name' => $name],
            [
                'module' => 'Requests',
                'label' => $name,
                'description' => $name,
                'is_active' => true,
                'guard_name' => 'web',
            ],
        );
    }

    public function test_authorized_user_can_create_request_type_with_fields(): void
    {
        $user = User::factory()->create();
        $permission = $this->ensurePermission('access-request-types-module');
        $user->givePermissionTo($permission);

        $payload = [
            'name' => 'Certificate Request',
            'description' => 'Issue certificates on demand',
            'has_fulfillment' => true,
            'is_published' => false,
            'fields' => [
                [
                    'label' => 'Recipient Name',
                    'field_type' => 'text',
                    'is_required' => true,
                ],
            ],
            'approval_steps' => [
                [
                    'name' => 'HR Review',
                    'approvers' => [
                        [
                            'approver_type' => 'user',
                            'approver_id' => $user->id,
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('request-types.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('request_types', [
            'name' => 'Certificate Request',
            'has_fulfillment' => true,
        ]);
        $this->assertDatabaseCount('request_fields', 1);
    }

    public function test_employee_can_submit_dynamic_request(): void
    {
        $builder = User::factory()->create();
        $permission = $this->ensurePermission('access-request-types-module');
        $builder->givePermissionTo($permission);

        $requestType = RequestType::create([
            'created_by' => $builder->id,
            'name' => 'Overtime Request',
            'description' => 'Approval for rendered overtime',
            'has_fulfillment' => false,
            'approval_steps' => [],
            'is_published' => true,
        ]);

        $field = $requestType->fields()->create([
            'field_key' => 'overtime_hours',
            'label' => 'Total Hours',
            'field_type' => 'number',
            'is_required' => true,
            'sort_order' => 0,
        ]);

        $employee = User::factory()->create();

        $response = $this->actingAs($employee)->post(route('requests.store', $requestType), [
            'answers' => [
                $field->field_key => '5',
            ],
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('request_submissions', [
            'request_type_id' => $requestType->id,
            'user_id' => $employee->id,
            'status' => 'approved',
        ]);

        $this->assertDatabaseHas('request_answers', [
            'field_id' => $field->id,
            'value' => '5',
        ]);
    }

    public function test_final_approver_without_permission_can_fulfill_request(): void
    {
        Storage::fake('public');

        $builder = User::factory()->create();
        $permission = $this->ensurePermission('access-request-types-module');
        $builder->givePermissionTo($permission);

        $finalApprover = User::factory()->create();
        $requester = User::factory()->create();

        $requestType = RequestType::create([
            'created_by' => $builder->id,
            'name' => 'Document Request',
            'description' => 'Requires fulfillment upload',
            'has_fulfillment' => true,
            'approval_steps' => [
                [
                    'name' => 'Final Approval',
                    'approvers' => [
                        [
                            'approver_type' => 'user',
                            'approver_id' => $finalApprover->id,
                        ],
                    ],
                ],
            ],
            'is_published' => true,
        ]);

        $submission = RequestSubmission::create([
            'request_type_id' => $requestType->id,
            'user_id' => $requester->id,
            'reference_code' => RequestSubmission::generateReferenceCode(),
            'status' => RequestSubmission::STATUS_FULFILLMENT,
            'submitted_at' => now(),
            'approval_state' => [],
        ]);

        RequestApprovalAction::create([
            'submission_id' => $submission->id,
            'step_index' => 0,
            'approver_id' => $finalApprover->id,
            'status' => RequestApprovalAction::STATUS_APPROVED,
            'acted_at' => now(),
        ]);

        $response = $this->actingAs($finalApprover)->post(route('requests.fulfill', $submission), [
            'file' => UploadedFile::fake()->create('certificate.pdf', 100, 'application/pdf'),
            'notes' => 'Completed output',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('request_submissions', [
            'id' => $submission->id,
            'status' => RequestSubmission::STATUS_COMPLETED,
        ]);

        $this->assertDatabaseHas('request_fulfillments', [
            'submission_id' => $submission->id,
            'fulfilled_by' => $finalApprover->id,
            'notes' => 'Completed output',
        ]);
    }

    public function test_parallel_approvers_must_all_approve_before_advancing(): void
    {
        $builder = User::factory()->create();
        $permission = $this->ensurePermission('access-request-types-module');
        $builder->givePermissionTo($permission);

        $approverA = User::factory()->create();
        $approverB = User::factory()->create();
        $requester = User::factory()->create();

        $requestType = RequestType::create([
            'created_by' => $builder->id,
            'name' => 'Parallel Approval',
            'has_fulfillment' => false,
            'approval_steps' => [
                [
                    'name' => 'Parallel Step',
                    'approvers' => [
                        ['approver_type' => 'user', 'approver_id' => $approverA->id],
                        ['approver_type' => 'user', 'approver_id' => $approverB->id],
                    ],
                ],
            ],
            'is_published' => true,
        ]);

        $submission = RequestSubmission::create([
            'request_type_id' => $requestType->id,
            'user_id' => $requester->id,
            'reference_code' => RequestSubmission::generateReferenceCode(),
            'status' => RequestSubmission::STATUS_PENDING,
            'current_step_index' => 0,
            'approval_state' => [],
        ]);

        $this->actingAs($approverA)->post(route('requests.approve', $submission))->assertRedirect();
        $submission->refresh();

        $this->assertSame(RequestSubmission::STATUS_PENDING, $submission->status);
        $this->assertSame(0, $submission->current_step_index);

        $this->actingAs($approverB)->post(route('requests.approve', $submission))->assertRedirect();
        $submission->refresh();

        $this->assertSame(RequestSubmission::STATUS_APPROVED, $submission->status);
        $this->assertNull($submission->current_step_index);
    }

    public function test_next_step_approver_cannot_approve_until_previous_step_is_done(): void
    {
        $builder = User::factory()->create();
        $permission = $this->ensurePermission('access-request-types-module');
        $builder->givePermissionTo($permission);

        $stepOneApprover = User::factory()->create();
        $stepTwoApprover = User::factory()->create();
        $requester = User::factory()->create();

        $requestType = RequestType::create([
            'created_by' => $builder->id,
            'name' => 'Sequential Approval',
            'has_fulfillment' => false,
            'approval_steps' => [
                [
                    'name' => 'Step One',
                    'approvers' => [
                        ['approver_type' => 'user', 'approver_id' => $stepOneApprover->id],
                    ],
                ],
                [
                    'name' => 'Step Two',
                    'approvers' => [
                        ['approver_type' => 'user', 'approver_id' => $stepTwoApprover->id],
                    ],
                ],
            ],
            'is_published' => true,
        ]);

        $submission = RequestSubmission::create([
            'request_type_id' => $requestType->id,
            'user_id' => $requester->id,
            'reference_code' => RequestSubmission::generateReferenceCode(),
            'status' => RequestSubmission::STATUS_PENDING,
            'current_step_index' => 0,
            'approval_state' => [],
        ]);

        $this->actingAs($stepTwoApprover)->post(route('requests.approve', $submission))->assertForbidden();

        $this->actingAs($stepOneApprover)->post(route('requests.approve', $submission))->assertRedirect();
        $submission->refresh();
        $this->assertSame(1, $submission->current_step_index);

        $this->actingAs($stepTwoApprover)->post(route('requests.approve', $submission))->assertRedirect();
        $submission->refresh();
        $this->assertSame(RequestSubmission::STATUS_APPROVED, $submission->status);
    }
}

