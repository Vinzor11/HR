<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class ApprovalComment extends Model
{
    use HasFactory;

    public const TYPE_COMMENT = 'comment';
    public const TYPE_APPROVAL_NOTE = 'approval_note';
    public const TYPE_REJECTION_NOTE = 'rejection_note';
    public const TYPE_SYSTEM = 'system';
    public const TYPE_WITHDRAWAL = 'withdrawal';
    public const TYPE_ESCALATION = 'escalation';

    protected $fillable = [
        'submission_id',
        'user_id',
        'approval_action_id',
        'content',
        'type',
        'is_internal',
        'attachments',
    ];

    protected $casts = [
        'is_internal' => 'boolean',
        'attachments' => 'array',
    ];

    /**
     * The request submission this comment belongs to.
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(RequestSubmission::class);
    }

    /**
     * The user who made this comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The approval action this comment is associated with (if any).
     */
    public function approvalAction(): BelongsTo
    {
        return $this->belongsTo(RequestApprovalAction::class, 'approval_action_id');
    }

    /**
     * Scope to get public comments (visible to requester).
     */
    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_internal', false);
    }

    /**
     * Scope to get internal comments (not visible to requester).
     */
    public function scopeInternal(Builder $query): Builder
    {
        return $query->where('is_internal', true);
    }

    /**
     * Scope to get comments by type.
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * Create a system comment for tracking events.
     */
    public static function createSystemComment(
        int $submissionId,
        string $content,
        ?int $userId = null,
        ?int $approvalActionId = null
    ): self {
        return static::create([
            'submission_id' => $submissionId,
            'user_id' => $userId,
            'approval_action_id' => $approvalActionId,
            'content' => $content,
            'type' => self::TYPE_SYSTEM,
            'is_internal' => true,
        ]);
    }

    /**
     * Create an approval note comment.
     */
    public static function createApprovalNote(
        int $submissionId,
        int $userId,
        string $content,
        int $approvalActionId,
        bool $isRejection = false
    ): self {
        return static::create([
            'submission_id' => $submissionId,
            'user_id' => $userId,
            'approval_action_id' => $approvalActionId,
            'content' => $content,
            'type' => $isRejection ? self::TYPE_REJECTION_NOTE : self::TYPE_APPROVAL_NOTE,
            'is_internal' => false,
        ]);
    }
}
