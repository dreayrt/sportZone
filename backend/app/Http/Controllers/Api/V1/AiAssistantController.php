<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\AiAssistantException;
use App\Http\Controllers\Api\BaseController;
use App\Http\Requests\Ai\ChatRequest;
use App\Services\AiAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiAssistantController extends BaseController
{
    public function __construct(private readonly AiAssistantService $assistant) {}

    public function chat(ChatRequest $request): JsonResponse
    {
        try {
            $data = $this->assistant->chat(
                trim((string) $request->validated('message')),
                $request->validated('history', []),
            );

            return $this->successResponse(
                $data,
                (string) ($data['message'] ?? 'Trợ lý SportZone đã trả lời.'),
            );
        } catch (AiAssistantException $exception) {
            Log::warning('Trợ lý AI SportZone tạm thời không khả dụng.', [
                'exception' => $exception::class,
                'reason' => $exception->getMessage(),
            ]);

            return $this->errorResponse(
                'Trợ lý AI hiện tạm thời không khả dụng. Vui lòng thử lại sau.',
                503,
            );
        } catch (Throwable $exception) {
            report($exception);

            return $this->errorResponse(
                'Trợ lý AI hiện tạm thời không khả dụng. Vui lòng thử lại sau.',
                503,
            );
        }
    }
}
