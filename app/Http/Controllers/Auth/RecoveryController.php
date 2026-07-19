<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class RecoveryController extends Controller
{
    private const SESSION_USER = 'recovery.user_id';
    private const SESSION_STARTED = 'recovery.started_at';
    private const SESSION_VERIFIED = 'recovery.verified_at';
    private const EXPIRES_AFTER = 600;

    public function showEmail()
    {
        return Inertia::render('Auth/RecoverPassword', ['step' => 'email']);
    }

    public function findAccount(Request $request)
    {
        $validated = $request->validate(['email' => 'required|email']);
        $email = Str::lower(trim($validated['email']));
        $key = 'recovery-find:'.$request->ip().':'.hash('sha256', $email);

        if (RateLimiter::tooManyAttempts($key, 5)) {
            return back()->withErrors([
                'email' => 'Too many recovery attempts. Please wait before trying again.',
            ]);
        }

        RateLimiter::hit($key, 60);
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$user || !$user->recovery_question || !$user->recovery_answer) {
            return back()->withErrors([
                'email' => 'Password recovery is unavailable for this account. Contact an administrator.',
            ]);
        }

        $request->session()->put([
            self::SESSION_USER => $user->id,
            self::SESSION_STARTED => now()->timestamp,
        ]);
        $request->session()->forget(self::SESSION_VERIFIED);

        return redirect()->route('password.recovery.question');
    }

    public function showQuestion(Request $request)
    {
        $user = $this->activeRecoveryUser($request);
        if (!$user) {
            return redirect()->route('password.recovery');
        }

        return Inertia::render('Auth/RecoverPassword', [
            'step' => 'question',
            'question' => $user->recovery_question,
        ]);
    }

    public function verifyAnswer(Request $request)
    {
        $user = $this->activeRecoveryUser($request);
        if (!$user) {
            return redirect()->route('password.recovery');
        }

        $validated = $request->validate(['answer' => 'required|string|max:255']);
        $key = 'recovery-answer:'.$request->ip().':'.$user->id;

        if (RateLimiter::tooManyAttempts($key, 5)) {
            return back()->withErrors([
                'answer' => 'Too many incorrect answers. Please wait before trying again.',
            ]);
        }

        $answer = $this->normalizeAnswer($validated['answer']);
        if (!Hash::check($answer, $user->recovery_answer)) {
            RateLimiter::hit($key, 300);

            return back()->withErrors(['answer' => 'The recovery answer is incorrect.']);
        }

        RateLimiter::clear($key);
        $request->session()->put(self::SESSION_VERIFIED, now()->timestamp);

        return redirect()->route('password.recovery.reset');
    }

    public function showReset(Request $request)
    {
        if (!$this->isVerified($request) || !$this->activeRecoveryUser($request)) {
            return redirect()->route('password.recovery');
        }

        return Inertia::render('Auth/RecoverPassword', ['step' => 'reset']);
    }

    public function reset(Request $request)
    {
        $user = $this->activeRecoveryUser($request);
        if (!$user || !$this->isVerified($request)) {
            return redirect()->route('password.recovery');
        }

        $validated = $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user->forceFill([
            'password' => $validated['password'],
            'remember_token' => Str::random(60),
        ])->save();

        $request->session()->forget([
            self::SESSION_USER,
            self::SESSION_STARTED,
            self::SESSION_VERIFIED,
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('workspaces.index')
            ->with('message', 'Your password has been reset successfully.');
    }

    private function activeRecoveryUser(Request $request): ?User
    {
        $startedAt = (int) $request->session()->get(self::SESSION_STARTED, 0);
        if (!$startedAt || now()->timestamp - $startedAt > self::EXPIRES_AFTER) {
            $request->session()->forget([
                self::SESSION_USER,
                self::SESSION_STARTED,
                self::SESSION_VERIFIED,
            ]);

            return null;
        }

        return User::find($request->session()->get(self::SESSION_USER));
    }

    private function isVerified(Request $request): bool
    {
        $verifiedAt = (int) $request->session()->get(self::SESSION_VERIFIED, 0);

        return $verifiedAt > 0 && now()->timestamp - $verifiedAt <= self::EXPIRES_AFTER;
    }

    private function normalizeAnswer(string $answer): string
    {
        return Str::lower(preg_replace('/\s+/', ' ', trim($answer)));
    }
}
