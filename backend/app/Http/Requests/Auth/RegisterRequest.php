<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $phone = $this->input('phone');
        if (is_string($phone)) {
            $this->merge(['phone' => preg_replace('/[\s.\-]/', '', $phone)]);
        }

        foreach (['full_name', 'email'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $this->merge([$field => trim($value)]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['nullable', 'email', 'max:150', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^(0|\+84)\d{9}$/', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed'],
            'role' => ['sometimes', 'nullable', Rule::in(['customer', 'owner'])],
            'cf-turnstile-response' => [
                config('services.turnstile.enabled') ? 'required' : 'nullable',
                'string',
                new \App\Rules\Turnstile,
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'Họ và tên không được để trống.',
            'full_name.min' => 'Họ và tên phải có ít nhất 2 ký tự.',
            'full_name.max' => 'Họ và tên không được vượt quá 120 ký tự.',
            'email.email' => 'Địa chỉ email không đúng định dạng.',
            'email.max' => 'Email không được vượt quá 150 ký tự.',
            'email.unique' => 'Email này đã được sử dụng.',
            'phone.required' => 'Số điện thoại không được để trống.',
            'phone.regex' => 'Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678).',
            'phone.max' => 'Số điện thoại không được vượt quá 20 ký tự.',
            'phone.unique' => 'Số điện thoại này đã được đăng ký.',
            'password.required' => 'Mật khẩu không được để trống.',
            'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
            'password.max' => 'Mật khẩu không được vượt quá 72 ký tự.',
            'password.confirmed' => 'Xác nhận mật khẩu không khớp.',
            'role.in' => 'Vai trò không hợp lệ (chỉ chấp nhận customer hoặc owner).',
            'cf-turnstile-response.required' => 'Vui lòng xác nhận captcha.',
        ];
    }
}
