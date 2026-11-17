'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { startBookingQrCamera } from '@/lib/booking-qr-camera';
import { parseBookingCheckInCode } from '@/lib/booking-checkin-code';

type BookingQrScannerProps = {
  onScan: (value: string) => void;
  onClose: () => void;
};

async function createQrReader() {
  const [{ BrowserQRCodeReader }, { DecodeHintType }, { decodeBookingQrBitmap }] = await Promise.all([
    import('@zxing/browser'), import('@zxing/library'), import('@/lib/booking-qr-decoder'),
  ]);
  const reader = new BrowserQRCodeReader(new Map([[DecodeHintType.TRY_HARDER, true]]), { delayBetweenScanAttempts: 150 });
  reader.decodeBitmap = decodeBookingQrBitmap;
  return reader;
}

export function BookingQrScanner({ onScan, onClose }: BookingQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const stopCameraRef = useRef<() => void>(() => {});
  const handledRef = useRef(false);
  const mountedRef = useRef(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let active = true;
    let stopCamera = () => {};
    const video = videoRef.current;
    stopCameraRef.current = () => { active = false; stopCamera(); };

    const startCamera = async () => {
      try {
        const reader = await createQrReader();
        if (!active || !video) return;
        stopCamera = startBookingQrCamera({
          video,
          openStream: async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {
              ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: 'environment' } }),
              width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 15, max: 30 },
            }, audio: false });
            if (active) {
              void navigator.mediaDevices.enumerateDevices().then((devices) => {
                if (active) setCameras(devices.filter((device) => device.kind === 'videoinput'));
              }).catch(() => {});
            }
            return stream;
          },
          decode: (stream, onResult) => reader.decodeFromStream(stream, video, (result) => {
            if (!result || !active) return;
            try { onResult(parseBookingCheckInCode(result.getText())); }
            catch (error) { setCameraError(error instanceof Error ? error.message : 'QR không hợp lệ.'); }
          }),
          onScan: (value) => {
            if (!active || handledRef.current) return;
            handledRef.current = true;
            onScanRef.current(value);
          },
          onError: () => { if (active) setCameraError('Không mở được camera. Hãy kiểm tra quyền camera hoặc nhập mã đơn bên dưới.'); },
        });
      } catch {
        if (active) {
          stopCamera();
          setCameraError('Không mở được camera. Hãy cấp quyền camera cho trình duyệt hoặc nhập mã đơn bên dưới.');
        }
      }
    };

    void startCamera();

    return () => { active = false; stopCamera(); };
  }, [cameraId]);

  const acceptCode = (value: string) => {
    try {
      const code = parseBookingCheckInCode(value);
      if (handledRef.current) return;
      handledRef.current = true;
      stopCameraRef.current();
      onScanRef.current(code);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'QR không hợp lệ.');
    }
  };

  const readQrImage = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setCameraError('Vui lòng chọn ảnh QR nhỏ hơn 10 MB.'); return; }
    const imageUrl = URL.createObjectURL(file);
    setIsReadingImage(true);
    setCameraError('');
    try {
      const reader = await createQrReader();
      const result = await reader.decodeFromImageUrl(imageUrl);
      if (mountedRef.current) acceptCode(result.getText());
    } catch {
      if (mountedRef.current) setCameraError('Không đọc được QR trong ảnh. Vui lòng dùng ảnh mã check-in rõ nét, có đủ viền trắng.');
    } finally {
      URL.revokeObjectURL(imageUrl);
      if (mountedRef.current) setIsReadingImage(false);
    }
  };

  const submitManualCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (manualCode.trim()) acceptCode(manualCode);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="checkin-scanner-title">
      <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="checkin-scanner-title" className="font-bold text-neutral-900 dark:text-white">Quét QR check-in</h2>
            <p className="text-xs text-neutral-500 mt-1">Dùng QR check-in của đơn đã thanh toán. Giữ toàn bộ mã và viền trắng trong khung hình.</p>
          </div>
          <button type="button" onClick={() => { stopCameraRef.current(); onClose(); }} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        {cameras.length > 1 && <label className="block text-xs text-neutral-500">Chọn camera<select aria-label="Chọn camera quét QR" value={cameraId} onChange={(event) => { setCameraError(''); setCameraId(event.target.value); }} className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm dark:bg-neutral-900"><option value="">Camera tự động</option>{cameras.map((camera, index) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</option>)}</select></label>}
        <div className="overflow-hidden rounded-xl bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-contain" autoPlay muted playsInline />
        </div>
        {cameraError && <p role="alert" className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">{cameraError}</p>}
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 p-2 text-sm font-medium dark:border-neutral-700">{isReadingImage ? 'Đang đọc ảnh QR...' : 'Chọn ảnh QR check-in từ máy'}<input type="file" accept="image/*" disabled={isReadingImage} className="sr-only" aria-label="Chọn ảnh QR check-in" onChange={(event) => { void readQrImage(event.target.files?.[0]); event.target.value = ''; }} /></label>

        <form onSubmit={submitManualCode} className="space-y-2">
          <label htmlFor="checkin-booking-code" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Hoặc nhập mã đơn</label>
          <div className="flex gap-2">
            <input
              id="checkin-booking-code"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Ví dụ: SZ-2ECZV"
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm font-mono uppercase"
            />
            <button type="submit" disabled={!manualCode.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Tra đơn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
