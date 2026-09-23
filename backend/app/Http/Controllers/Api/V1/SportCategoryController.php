<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\SportCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SportCategoryController extends BaseController
{
    /**
     * Danh sách tất cả các môn thể thao đang hoạt động
     */
    public function index(): JsonResponse
    {
        $categories = SportCategory::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->get();

        return $this->successResponse($categories, 'Lấy danh sách môn thể thao thành công.');
    }

    /**
     * Chi tiết một môn thể thao theo id hoặc code
     */
    public function show(string $idOrCode): JsonResponse
    {
        $category = is_numeric($idOrCode)
            ? SportCategory::find($idOrCode)
            : SportCategory::where('code', $idOrCode)->first();

        if (!$category) {
            return $this->notFound('Không tìm thấy môn thể thao yêu cầu.');
        }

        return $this->successResponse($category, 'Lấy thông tin môn thể thao thành công.');
    }

    /**
     * Thêm mới môn thể thao (Dành cho Admin)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:30', 'unique:sport_categories,code'],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'banner_image' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $category = SportCategory::create($validated);

        return $this->successResponse($category, 'Tạo danh mục môn thể thao thành công.', 201);
    }

    /**
     * Cập nhật môn thể thao (Dành cho Admin)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $category = SportCategory::find($id);

        if (!$category) {
            return $this->notFound('Không tìm thấy môn thể thao yêu cầu.');
        }

        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:30', 'unique:sport_categories,code,' . $id],
            'name' => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'banner_image' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $category->update($validated);

        return $this->successResponse($category, 'Cập nhật danh mục thể thao thành công.');
    }

    /**
     * Xóa môn thể thao (Dành cho Admin)
     */
    public function destroy(int $id): JsonResponse
    {
        $category = SportCategory::find($id);

        if (!$category) {
            return $this->notFound('Không tìm thấy môn thể thao yêu cầu.');
        }

        $category->delete();

        return $this->successResponse(null, 'Đã xóa danh mục thể thao thành công.');
    }
}
