<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private User $user1;
    private User $user2;
    private Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user1 = User::factory()->create([
            "name" => "Alice Cooper",
            "email" => "alice@example.com",
            "title" => "Lead Designer",
        ]);

        $this->user2 = User::factory()->create([
            "name" => "Bob Builder",
            "email" => "bob@example.com",
        ]);

        $this->workspace = Workspace::create([
            "name" => "Creative Suite",
            "owner_id" => $this->user1->id,
        ]);

        // Attach both to workspace
        $this->workspace->members()->attach([
            $this->user1->id => ["role" => "owner", "color" => "#d9745b"],
            $this->user2->id => ["role" => "member", "color" => "#8b9a7c"],
        ]);
    }

    public function test_workspace_member_can_view_profile(): void
    {
        $response = $this
            ->actingAs($this->user2)
            ->get(
                route("members.profile", [$this->workspace->slug, $this->user1->id])
            );

        $response->assertStatus(200);
        $response->assertSee("Alice Cooper");
        $response->assertSee("Lead Designer");
    }

    public function test_non_member_cannot_view_profile(): void
    {
        $outsider = User::factory()->create();

        $response = $this
            ->actingAs($outsider)
            ->get(
                route("members.profile", [$this->workspace->slug, $this->user1->id])
            );

        $response->assertStatus(403);
    }

    public function test_user_can_update_own_profile_details_and_color(): void
    {
        $response = $this
            ->actingAs($this->user1)
            ->post(
                route("members.profile.update", [$this->workspace->slug]),
                [
                    "name" => "Alice C. Cooper",
                    "title" => "Director of Design",
                    "bio" => "Cozy designer since 2012.",
                    "color" => "#e5a93b",
                ]
            );

        $response->assertRedirect();
        
        $this->assertDatabaseHas("users", [
            "id" => $this->user1->id,
            "name" => "Alice C. Cooper",
            "title" => "Director of Design",
            "bio" => "Cozy designer since 2012.",
        ]);

        // Assert workspace pivot color was updated
        $this->assertEquals(
            "#e5a93b",
            $this->workspace->members()->where("users.id", $this->user1->id)->first()->pivot->color
        );
    }

    public function test_user_can_upload_avatar_and_crop(): void
    {
        // Use a generic fake file that doesn't trigger Laravel's GD generateImage code
        $file = UploadedFile::fake()->create('avatar.png', 100, 'image/png');

        $response = $this
            ->actingAs($this->user1)
            ->post(
                route("members.profile.update", [$this->workspace->slug]),
                [
                    "name" => "Alice Cooper",
                    "title" => "Lead Designer",
                    "bio" => "Cozy designer.",
                    "avatar" => $file,
                ]
            );

        $response->assertRedirect();

        $user = $this->user1->fresh();
        $this->assertNotNull($user->avatar_path);
        
        $filePath = public_path($user->avatar_path);
        $this->assertTrue(file_exists($filePath));

        // If GD is available, assert that it was center-cropped to 300x300.
        if (function_exists('imagecreatetruecolor')) {
            $info = getimagesize($filePath);
            $this->assertEquals(300, $info[0]);
            $this->assertEquals(300, $info[1]);
        }

        // Cleanup
        @unlink($filePath);
    }
}
