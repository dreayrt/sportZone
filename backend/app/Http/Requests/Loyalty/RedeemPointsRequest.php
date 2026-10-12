<?php

namespace App\Http\Requests\Loyalty;

use App\Traits\ApiResponseTrait;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class RedeemPointsRequest extends FormRequest
{
    use ApiResponseTrait;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'points' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'points.required' => 'Vui lòng chọn số điểm cần đổi.',
            'points.integer' => 'Số điểm cần đổi phải là số nguyên.',
            'points.min' => 'Số điểm cần đổi phải lớn hơn 0.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            $this->validationError($validator->errors())
        );
    }
}
