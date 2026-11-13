<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $login = $this->input('login');
        if (is_string($login)) {
            $normalized = trim($login);

            if (filter_var($normalized, FILTER_VALIDATE_EMAIL) === false) {
                $normalized = preg_replace('/[\s.\-]/', '', $normalized);
            }

            $this->merge(['login' => $normalized]);
        }
    }

    public function rules(): array
    {
        return [
            'login' => [
                'required',
                'string',
                'min:3',
                'max:150',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $isEmail = filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
                    $isPhone = preg_match('/^(0|\+84)\d{9}$/', (string) $value) === 1;

                    if (! $isEmail && ! $isPhone) {
                        $fail('Vui lòng nhập email hoặc số điện thoại hợp lệ.');
                    }
                },
            ],
            'password' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'login.required' => 'Vui lòng nhập email hoặc số điện thoại.',
            'login.min' => 'Thông tin đăng nhập quá ngắn.',
            'login.max' => 'Thông tin đăng nhập không được vượt quá 150 ký tự.',
            'password.required' => 'Vui lòng nhập mật khẩu.',
            'password.max' => 'Mật khẩu không được vượt quá 255 ký tự.',
        ];
    }
}
