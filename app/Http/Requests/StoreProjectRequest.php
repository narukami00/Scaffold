<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // We'll handle role-based security in the controller for now
    }

    public function rules(): array
    {
        return [
            "name" => "required|string|max:255",
            "description" => "nullable|string|max:1000",
        ];
    }
}
