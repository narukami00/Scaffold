<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $project = $this->route("project");
        $task = $this->route("task");

        return [
            "title" => "sometimes|string|max:255",
            "description" => "nullable|string|max:2000",
            "status" => "sometimes|in:backlog,in_progress,in_review,done",
            "priority" => "sometimes|in:low,medium,high,urgent",
            "position" => "sometimes|integer",
            "x_pos" => "sometimes|integer",
            "y_pos" => "sometimes|integer",
            "due_date" => "nullable|date",
            "assignee_id" => "nullable|exists:users,id",
            "dependencies" => "nullable|array",
            "dependencies.*" => [
                "integer",
                Rule::exists("tasks", "id")->where(
                    fn ($query) => $query->where("project_id", $project?->id),
                ),
                Rule::notIn([$task?->id]), // Prevent self-dependency
            ],
        ];
    }
}
