<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskAttachmentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MediaController;

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public Routes
Route::get("/", function () {
    return redirect()->route("login");
});

Route::get("/register", [AuthController::class, "showRegister"])->name(
    "register",
);
Route::post("/register", [AuthController::class, "register"]);

Route::get("/login", [AuthController::class, "showLogin"])->name("login");
Route::post("/login", [AuthController::class, "login"]);



// Public webhook for GitHub App events
Route::post("/webhooks/github", [
    \App\Http\Controllers\GitHubWebhookController::class,
    "handle",
])->name("github.webhook");

// Protected Routes (Login Required)
Route::middleware("auth")->group(function () {
    Route::post("/logout", [AuthController::class, "logout"])->name("logout");

    // GitHub Callback
    Route::get("/github/callback", [\App\Http\Controllers\GitHubAppController::class, "callback"])->name("github.callback");

    // Workspaces
    Route::get("/workspaces", [WorkspaceController::class, "index"])->name(
        "workspaces.index",
    );
    Route::post("/workspaces", [WorkspaceController::class, "store"])->name(
        "workspaces.store",
    );
    Route::get("/workspaces/{workspace}", [
        WorkspaceController::class,
        "show",
    ])->name("workspaces.show");

    Route::get("/workspaces/{workspace}/settings", [
        WorkspaceController::class,
        "edit",
    ])->name("workspaces.edit");
    Route::patch("/workspaces/{workspace}", [
        WorkspaceController::class,
        "update",
    ])->name("workspaces.update");
    Route::delete("/workspaces/{workspace}", [
        WorkspaceController::class,
        "destroy",
    ])->name("workspaces.destroy");

    // Invitations
    Route::post("/workspaces/{workspace}/invitations", [
        InvitationController::class,
        "store",
    ])->name("workspaces.invitations.store");
    Route::get("/invitations/accept/{token}", [
        InvitationController::class,
        "show",
    ])->name("invitations.show");
    Route::post("/invitations/accept/{token}", [
        InvitationController::class,
        "accept",
    ])->name("invitations.accept");
    Route::post("/invitations/decline/{token}", [
        InvitationController::class,
        "decline",
    ])->name("invitations.decline");

    // Media Upload
    Route::post("/workspaces/{workspace:slug}/media/upload", [
        MediaController::class,
        "upload"
    ])->name("workspaces.media.upload");

    // Notifications
    Route::get("/notifications", [NotificationController::class, "index"])->name("notifications.index");
    Route::post("/notifications/{id}/read", [NotificationController::class, "markRead"])->name("notifications.mark-read");
    Route::post("/notifications/read-all", [NotificationController::class, "markAllRead"])->name("notifications.mark-all-read");

    // Projects (Nested under Workspaces)
    Route::prefix("/workspaces/{workspace:slug}")->group(function () {
        Route::get("/members/{user}", [
            \App\Http\Controllers\ProfileController::class,
            "show",
        ])->name("members.profile");

        Route::post("/members/profile", [
            \App\Http\Controllers\ProfileController::class,
            "update",
        ])->name("members.profile.update");

        Route::get("/github/connect", [
            \App\Http\Controllers\GitHubAppController::class,
            "connect"
        ])->name("workspaces.github.connect");

        Route::post("/projects", [ProjectController::class, "store"])->name(
            "workspaces.projects.store",
        );

        Route::get("/search", [
            \App\Http\Controllers\SearchController::class,
            "search",
        ])->name("workspaces.search");

        Route::patch("/preferences/color", [
            WorkspaceController::class,
            "updateMemberColor",
        ])->name("workspaces.preferences.color");

        // Scope bindings ensure the project actually belongs to the workspace
        Route::scopeBindings()->group(function () {
            Route::get("/projects/{project}", [
                ProjectController::class,
                "show",
            ])->name("workspaces.projects.show");
            Route::patch("/projects/{project}", [
                ProjectController::class,
                "update",
            ])->name("workspaces.projects.update");
            Route::delete("/projects/{project}", [
                ProjectController::class,
                "destroy",
            ])->name("workspaces.projects.destroy");
            Route::get("/projects/{project}/board", [
                ProjectController::class,
                "board",
            ])->name("projects.board");
            // Wiki Operations
            Route::get("/projects/{project}/wiki", [
                \App\Http\Controllers\WikiController::class,
                "index",
            ])->name("workspaces.projects.wiki.index");
            
            Route::get("/projects/{project}/wiki/create", [
                \App\Http\Controllers\WikiController::class,
                "create",
            ])->name("workspaces.projects.wiki.create");
            
            Route::post("/projects/{project}/wiki", [
                \App\Http\Controllers\WikiController::class,
                "store",
            ])->name("workspaces.projects.wiki.store");
            
            Route::get("/projects/{project}/wiki/{wiki}", [
                \App\Http\Controllers\WikiController::class,
                "show",
            ])->name("workspaces.projects.wiki.show");
            
            Route::get("/projects/{project}/wiki/{wiki}/edit", [
                \App\Http\Controllers\WikiController::class,
                "edit",
            ])->name("workspaces.projects.wiki.edit");
            
            Route::patch("/projects/{project}/wiki/{wiki}", [
                \App\Http\Controllers\WikiController::class,
                "update",
            ])->name("workspaces.projects.wiki.update");
            
            Route::delete("/projects/{project}/wiki/{wiki}", [
                \App\Http\Controllers\WikiController::class,
                "destroy",
            ])->name("workspaces.projects.wiki.destroy");
            Route::get("/projects/{project}/activity", [
                \App\Http\Controllers\GitController::class,
                "index",
            ])->name("projects.activity");
            


            // GitHub Integration
             Route::get("/github/repositories", [
                 \App\Http\Controllers\GitHubAppController::class,
                 "listRepositories"
             ])->name("workspaces.github.repositories");

             Route::get("/projects/{project}/settings-data", [
                 \App\Http\Controllers\ProjectController::class,
                 "settingsData"
             ])->name("workspaces.projects.settings-data");

            Route::post("/projects/{project}/github/link", [
                \App\Http\Controllers\GitHubAppController::class,
                "linkRepository"
            ])->name("workspaces.projects.github.link");

            Route::post("/projects/{project}/github/unlink", [
                \App\Http\Controllers\GitHubAppController::class,
                "unlinkRepository"
            ])->name("workspaces.projects.github.unlink");

            // Thread Operations
            Route::get("/projects/{project}/threads", [
                \App\Http\Controllers\ThreadController::class,
                "index",
            ])->name("workspaces.projects.threads.index");
            
            Route::post("/projects/{project}/threads", [
                \App\Http\Controllers\ThreadController::class,
                "store",
            ])->name("workspaces.projects.threads.store");
            
            Route::get("/projects/{project}/threads/{thread}", [
                \App\Http\Controllers\ThreadController::class,
                "show",
            ])->name("workspaces.projects.threads.show");
            
            Route::patch("/projects/{project}/threads/{thread}", [
                \App\Http\Controllers\ThreadController::class,
                "update",
            ])->name("workspaces.projects.threads.update");
            
            Route::delete("/projects/{project}/threads/{thread}", [
                \App\Http\Controllers\ThreadController::class,
                "destroy",
            ])->name("workspaces.projects.threads.destroy");
            
            Route::post("/projects/{project}/threads/{thread}/pin", [
                \App\Http\Controllers\ThreadController::class,
                "pin",
            ])->name("workspaces.projects.threads.pin");

            // Thread Reply Operations
            Route::post("/projects/{project}/threads/{thread}/replies", [
                \App\Http\Controllers\ThreadReplyController::class,
                "store",
            ])->name("workspaces.projects.threads.replies.store");
            
            Route::post("/projects/{project}/threads/{thread}/replies/{reply}/definitive", [
                \App\Http\Controllers\ThreadReplyController::class,
                "markDefinitive",
            ])->name("workspaces.projects.threads.replies.definitive");

            Route::delete("/projects/{project}/threads/{thread}/replies/{reply}", [
                \App\Http\Controllers\ThreadReplyController::class,
                "destroy",
            ])->name("workspaces.projects.threads.replies.destroy");

            // Reactions Operation
            Route::post("/projects/{project}/reactions/toggle", [
                \App\Http\Controllers\ReactionController::class,
                "toggle",
            ])->name("workspaces.projects.reactions.toggle");

            // Task Operations
            Route::post("/projects/{project}/tasks", [
                TaskController::class,
                "store",
            ])->name("tasks.store");
            Route::patch("/projects/{project}/tasks/{task}", [
                TaskController::class,
                "update",
            ])->name("tasks.update");
            Route::delete("/projects/{project}/tasks/{task}", [
                TaskController::class,
                "destroy",
            ])->name("tasks.destroy");

            // Comment Operations
            Route::post("/tasks/{task}/comments", [
                TaskCommentController::class,
                "store",
            ])->name("tasks.comments.store");

            // Task Control & Attachments
            Route::post("/projects/{project}/tasks/{task}/transfer-control", [
                TaskController::class,
                "transferControl",
            ])->name("tasks.transfer-control");
            // Label Operations (managed by Owner)
            Route::post("/projects/{project}/labels", [
                \App\Http\Controllers\LabelController::class,
                "store",
            ])->name("projects.labels.store");
            Route::patch("/projects/{project}/labels/{label}", [
                \App\Http\Controllers\LabelController::class,
                "update",
            ])->name("projects.labels.update");
            Route::delete("/projects/{project}/labels/{label}", [
                \App\Http\Controllers\LabelController::class,
                "destroy",
            ])->name("projects.labels.destroy");

            // Task Label Syncing (members can attach/detach)
            Route::post("/projects/{project}/tasks/{task}/labels", [
                \App\Http\Controllers\TaskController::class,
                "syncLabels",
            ])->name("tasks.labels.sync");
        });
    });
});


