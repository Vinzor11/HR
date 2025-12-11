<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailVerificationCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'code',
        'pending_user_data',
        'expires_at',
        'verified',
    ];

    protected $casts = [
        'pending_user_data' => 'array',
        'expires_at' => 'datetime',
        'verified' => 'boolean',
    ];

    /**
     * Check if the verification code has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the code is valid and not expired.
     */
    public function isValid(string $code): bool
    {
        return $this->code === $code && !$this->isExpired() && !$this->verified;
    }

    /**
     * Generate a new 6-digit verification code.
     */
    public static function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Create a new verification code for the given email.
     */
    public static function createForEmail(string $email, array $pendingUserData = []): self
    {
        // Delete any existing codes for this email
        static::where('email', $email)->delete();

        return static::create([
            'email' => $email,
            'code' => static::generateCode(),
            'pending_user_data' => $pendingUserData,
            'expires_at' => now()->addMinutes(10), // Code expires in 10 minutes
        ]);
    }
}

