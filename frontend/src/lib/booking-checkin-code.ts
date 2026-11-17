const BOOKING_CODE = /^(?:SZ|SPZ|SPORTZONE)-?[A-Z0-9]{1,29}$/;

export function parseBookingCheckInCode(value: string): string {
  const raw = value.trim();
  if (raw.startsWith('000201')) {
    throw new Error('Đây là QR thanh toán ngân hàng. Vui lòng mở mã QR check-in trong vé của đơn đã thanh toán.');
  }

  let candidate = raw;
  if (raw.startsWith('{')) {
    try {
      const payload = JSON.parse(raw);
      candidate = payload.booking_code ?? payload.bookingCode ?? '';
    } catch {
      candidate = '';
    }
  } else if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      candidate = url.searchParams.get('booking_code') ?? url.searchParams.get('code')
        ?? url.searchParams.get('booking') ?? url.pathname.match(/\/bookings\/([^/]+)\/?$/)?.[1] ?? '';
    } catch {
      candidate = '';
    }
  }

  const code = typeof candidate === 'string' ? candidate.trim().toUpperCase() : '';
  if (!BOOKING_CODE.test(code)) {
    throw new Error('QR không chứa mã đặt sân SportZone hợp lệ. Hãy dùng QR check-in hoặc nhập mã đơn SZ-... bên dưới.');
  }
  // The payment memo omits the separator, while bookings store SZ-XXXXX.
  if (/^SZ[A-Z0-9]+$/.test(code)) return `SZ-${code.slice(2)}`;
  return code;
}
