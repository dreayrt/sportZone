<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponseTrait
{
    /**
     * Response thành công chuẩn
     */
    public function successResponse(mixed $data = null, string $message = 'Thao tác thành công', int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'errors' => null,
        ], $statusCode);
    }

    /**
     * Response lỗi nghiệp vụ hoặc server
     */
    public function errorResponse(string $message = 'Đã có lỗi xảy ra', int $statusCode = 400, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors,
        ], $statusCode);
    }

    /**
     * Response lỗi validation (422)
     */
    public function validationError(mixed $errors, string $message = 'Dữ liệu không hợp lệ'): JsonResponse
    {
        return $this->errorResponse($message, 422, $errors);
    }

    /**
     * Response lỗi chưa xác thực (401)
     */
    public function unauthorized(string $message = 'Vui lòng đăng nhập để tiếp tục'): JsonResponse
    {
        return $this->errorResponse($message, 401);
    }

    /**
     * Response lỗi không có quyền truy cập (403)
     */
    public function forbidden(string $message = 'Bạn không có quyền thực hiện thao tác này'): JsonResponse
    {
        return $this->errorResponse($message, 403);
    }

    /**
     * Response lỗi không tìm thấy tài nguyên (404)
     */
    public function notFound(string $message = 'Không tìm thấy dữ liệu yêu cầu'): JsonResponse
    {
        return $this->errorResponse($message, 404);
    }
}
