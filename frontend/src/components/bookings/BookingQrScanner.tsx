'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type BookingQrScannerProps = {
  onScan: (value: string) => void;
  onClose: () => void;
};

export function BookingQrScanner({ onScan, onClose }: BookingQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    let active = true;
    let handled = false;
    let controls: { stop: () => void } | undefined;

    const startCamera = async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (!active || !videoRef.current) return;

        const reader = new BrowserQRCodeReader();
        const scannerControls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, _error, callbackControls) => {
            if (!result || !active || handled) return;
            handled = true;
            callbackControls.stop();
            onScan(result.getText());
          }
        );

        controls = scannerControls;
        if (!active) controls.stop();
      } catch {
        if (active) {
          setCameraError('Không mở được camera. Hãy cấp quyền camera cho trình duyệt hoặc nhập mã đơn bên dưới.');
        }
      }
    };

    void startCamera();

    return () => {
      active = false;
      controls?.stop();
    };
  }, [onScan]);

  const submitManualCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = manualCode.trim();
    if (code) onScan(code);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="checkin-scanner-title">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="checkin-scanner-title" className="font-bold text-neutral-900 dark:text-white">Quét QR check-in</h2>
            <p className="text-xs text-neutral-500 mt-1">Đưa mã check-in trên điện thoại khách vào khung hình.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
        </div>
        {cameraError && <p role="alert" className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">{cameraError}</p>}

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
