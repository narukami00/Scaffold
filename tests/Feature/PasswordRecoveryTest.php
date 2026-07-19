<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_reset_password_with_recovery_answer(): void
    {
        $user = User::factory()->create([
            'email' => 'recover@example.com',
            'password' => 'old-password',
            'recovery_question' => 'What was the name of my first project?',
            'recovery_answer' => Hash::make('blue sky'),
        ]);

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect(route('password.recovery.question'));

        $this->post('/forgot-password/question', ['answer' => '  Blue   Sky '])
            ->assertRedirect(route('password.recovery.reset'));

        $this->post('/forgot-password/reset', [
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertRedirect(route('workspaces.index'));

        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_incorrect_recovery_answer_is_rejected(): void
    {
        $user = User::factory()->create([
            'email' => 'incorrect@example.com',
            'recovery_question' => 'What was the name of my first project?',
            'recovery_answer' => Hash::make('correct answer'),
        ]);

        $this->post('/forgot-password', ['email' => $user->email]);

        $this->post('/forgot-password/question', ['answer' => 'wrong answer'])
            ->assertSessionHasErrors('answer');

        $this->get('/forgot-password/reset')
            ->assertRedirect(route('password.recovery'));
    }

    public function test_registration_hashes_optional_recovery_answer(): void
    {
        $this->post('/register', [
            'name' => 'Recovery User',
            'email' => 'register-recovery@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'recovery_question' => 'What was the name of my first project?',
            'recovery_answer' => '  Secret   Project ',
        ])->assertRedirect(route('workspaces.index'));

        $user = User::where('email', 'register-recovery@example.com')->firstOrFail();
        $this->assertNotSame('Secret Project', $user->recovery_answer);
        $this->assertTrue(Hash::check('secret project', $user->recovery_answer));
    }
}
