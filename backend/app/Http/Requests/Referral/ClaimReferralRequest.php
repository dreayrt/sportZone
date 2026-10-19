<?php

namespace App\Http\Requests\Referral;

use Illuminate\Foundation\Http\FormRequest;

class ClaimReferralRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'Vui lòng nhập mã giới thiệu.',
            'code.string' => 'Mã giới thiệu không hợp lệ.',
            'code.max' => 'Mã giới thiệu không được vượt quá 20 ký tự.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge([
                'code' => mb_strtoupper(trim((string) $this->input('code'))),
            ]);
        }
    }
}
