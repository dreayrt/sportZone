<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:500'],
            'history' => ['sometimes', 'array', 'max:6'],
            'history.*.role' => ['required_with:history', 'string', Rule::in(['user', 'assistant'])],
            'history.*.content' => ['required_with:history', 'string', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'message.required' => 'Vui lòng nhập nội dung cần hỏi.',
            'message.max' => 'Tin nhắn không được vượt quá 500 ký tự.',
            'history.max' => 'Chỉ được gửi tối đa 6 tin nhắn gần nhất.',
        ];
    }
}
