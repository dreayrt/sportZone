import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { startBookingQrCamera } from './booking-qr-camera.ts';

function fixture() {
  let trackStops = 0;
  let decoderStops = 0;
  const video = { srcObject: null };
  const stream = { getTracks: () => [{ stop: () => { trackStops++; } }] };
  const controls = { stop: () => { decoderStops++; } };
  return { video, stream, controls, stops: () => ({ tracks: trackStops, decoder: decoderStops }) };
}

test('opens one stream and delivers only one result before releasing the camera', async () => {
  const f = fixture();
  const results = [];
  let receive;
  let opens = 0;
  const stop = startBookingQrCamera({
    video: f.video,
    openStream: async () => { opens++; return f.stream; },
    decode: async (stream, onResult) => { f.video.srcObject = stream; receive = onResult; return f.controls; },
    onScan: (value) => results.push(value),
    onError: () => assert.fail('camera should start'),
  });
  await setImmediate();
  receive('SZ-FIRST');
  receive('SZ-DUPLICATE');
  stop();
  assert.equal(opens, 1);
  assert.deepEqual(results, ['SZ-FIRST']);
  assert.deepEqual(f.stops(), { tracks: 1, decoder: 1 });
  assert.equal(f.video.srcObject, null);
});

test('closing while camera permission is pending stops the late stream without decoding', async () => {
  const f = fixture();
  let grant;
  let decodes = 0;
  const stop = startBookingQrCamera({
    video: f.video,
    openStream: () => new Promise((resolve) => { grant = resolve; }),
    decode: async () => { decodes++; return f.controls; },
    onScan: () => assert.fail('closed scanner must not deliver results'),
    onError: () => assert.fail('closing must not show an error'),
  });
  stop();
  grant(f.stream);
  await setImmediate();
  assert.equal(decodes, 0);
  assert.deepEqual(f.stops(), { tracks: 1, decoder: 0 });
});

test('closing during decoder initialization releases the stream and eventual controls', async () => {
  const f = fixture();
  let finish;
  const stop = startBookingQrCamera({
    video: f.video,
    openStream: async () => f.stream,
    decode: () => new Promise((resolve) => { finish = resolve; }),
    onScan: () => assert.fail('closed scanner must not deliver results'),
    onError: () => assert.fail('closing must not show an error'),
  });
  await setImmediate();
  stop();
  assert.equal(f.stops().tracks, 1);
  finish(f.controls);
  await setImmediate();
  assert.deepEqual(f.stops(), { tracks: 1, decoder: 1 });
});

test('decoder failure releases the stream and reports the error without requesting the camera again', async () => {
  const f = fixture();
  let opens = 0;
  let errors = 0;
  startBookingQrCamera({
    video: f.video,
    openStream: async () => { opens++; return f.stream; },
    decode: async () => { throw new Error('decoder failure'); },
    onScan: () => assert.fail('failed scanner must not deliver results'),
    onError: () => { errors++; },
  });
  await setImmediate();
  assert.equal(opens, 1);
  assert.equal(errors, 1);
  assert.equal(f.stops().tracks, 1);
});
