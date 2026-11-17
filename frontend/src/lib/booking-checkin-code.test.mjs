import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import sharp from 'sharp';
import ZXing from '@zxing/library';
import { parseBookingCheckInCode } from './booking-checkin-code.ts';
import { decodeBookingQrBitmap } from './booking-qr-decoder.ts';

const { BinaryBitmap, HybridBinarizer, RGBLuminanceSource } = ZXing;

test('accepts the booking code and supported booking links and JSON without making requests', () => {
  for (const input of [' sz-7c5m ', 'SZ7C5M', '{"booking_code":"SZ-7C5M"}',
    'http://localhost:3000/dashboard/customer/bookings?booking=SZ-7C5M',
    'http://localhost:8000/api/v1/bookings/SZ-7C5M']) {
    assert.equal(parseBookingCheckInCode(input), 'SZ-7C5M');
  }
});

test('rejects payment QR payloads, arbitrary URLs and malformed codes', () => {
  assert.throws(() => parseBookingCheckInCode('0002010102123867BANKPAYMENT'), /QR thanh toán/);
  for (const input of ['https://example.com', '{"booking_code":42}', '{broken', 'SZ-123/../456', '']) {
    assert.throws(() => parseBookingCheckInCode(input), /không chứa mã/);
  }
});

test('the actual check-in SVG is decoded back into its booking code by the scanner library', async () => {
  const svg = renderToStaticMarkup(React.createElement(QRCodeSVG, {
    value: 'SZ-7C5M', size: 256, level: 'H', minVersion: 2, includeMargin: true,
  }));
  const { data, info } = await sharp(Buffer.from(svg)).resize(512, 512).flatten({ background: '#fff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const luminance = new Uint8ClampedArray(info.width * info.height);
  for (let i = 0; i < luminance.length; i++) luminance[i] = (data[i * 4] + 2 * data[i * 4 + 1] + data[i * 4 + 2]) / 4;
  const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, info.width, info.height)));
  const result = decodeBookingQrBitmap(bitmap);
  assert.equal(parseBookingCheckInCode(result.getText()), 'SZ-7C5M');
});

for (const orientation of ['original', 'mirrored', 'rotated']) {
  test(`reads the tilted phone QR from the reported camera frame (${orientation})`, async () => {
    let image = sharp(fileURLToPath(new URL('./__fixtures__/booking-checkin-camera.png', import.meta.url)));
    if (orientation === 'mirrored') image = image.flop();
    if (orientation === 'rotated') image = image.rotate(90);
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const luminance = new Uint8ClampedArray(info.width * info.height);
    for (let i = 0; i < luminance.length; i++) luminance[i] = (306 * data[i * 4] + 601 * data[i * 4 + 1] + 117 * data[i * 4 + 2] + 512) >> 10;
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, info.width, info.height)));
    assert.equal(parseBookingCheckInCode(decodeBookingQrBitmap(bitmap).getText()), 'SZ-Y7C5M');
  });
}

test('an empty camera frame remains unreadable instead of producing a booking code', () => {
  const luminance = new Uint8ClampedArray(320 * 240).fill(255);
  const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, 320, 240)));
  assert.throws(() => decodeBookingQrBitmap(bitmap));
});
