import * as ZXingModule from '@zxing/library';
import type { BinaryBitmap, BitMatrix, Result } from '@zxing/library';
import type ESMDetector from '@zxing/library/esm/core/qrcode/detector/Detector';
import DetectorModule from '@zxing/library/cjs/core/qrcode/detector/Detector.js';

// The detector is not exported from the package entry point. Normalize its CJS
// wrapper so the same decoder runs in the browser bundle and the Node tests.
const ZXing: typeof ZXingModule = Reflect.get(ZXingModule, 'default') ?? ZXingModule;
const Detector = ((DetectorModule as typeof DetectorModule & { default?: typeof DetectorModule }).default ?? DetectorModule) as unknown as typeof ESMDetector;
const hints = new Map([[ZXing.DecodeHintType.TRY_HARDER, true]]);
const offsets = [0, -0.025, 0.025, -0.05, 0.05, -0.075, 0.075, -0.1, 0.1, -0.15, 0.15];

class PerspectiveQrReader extends ZXing.QRCodeReader {
  decodeSample(bits: BitMatrix) {
    return this.getDecoder().decodeBitMatrix(bits, hints);
  }
}

export function decodeBookingQrBitmap(bitmap: BinaryBitmap): Result {
  const reader = new PerspectiveQrReader();
  let originalError: unknown;
  try {
    return reader.decode(bitmap, hints);
  } catch (error) {
    originalError = error;
  }

  try {
    const matrix = bitmap.getBlackMatrix();
    const detected = new Detector(matrix).detect(hints);
    const points = detected.getPoints();
    const dimension = detected.getBits().getWidth();
    // Version 1 has no fourth alignment marker. Its affine corner estimate can
    // miss modules on a tilted phone. Try bounded projective corrections; each
    // candidate must still pass the QR decoder's error correction and checksum.
    if (dimension !== 21 || points.length !== 3) throw originalError;
    const [bottomLeft, topLeft, topRight] = points;
    const rightX = topRight.getX() - topLeft.getX();
    const rightY = topRight.getY() - topLeft.getY();
    const downX = bottomLeft.getX() - topLeft.getX();
    const downY = bottomLeft.getY() - topLeft.getY();
    const edge = dimension - 3.5;

    for (const downOffset of offsets) {
      for (const rightOffset of offsets) {
        if (downOffset === 0 && rightOffset === 0) continue;
        const transform = ZXing.PerspectiveTransform.quadrilateralToQuadrilateral(
          3.5, 3.5, edge, 3.5, edge, edge, 3.5, edge,
          topLeft.getX(), topLeft.getY(), topRight.getX(), topRight.getY(),
          topLeft.getX() + rightX * (1 + rightOffset) + downX * (1 + downOffset),
          topLeft.getY() + rightY * (1 + rightOffset) + downY * (1 + downOffset),
          bottomLeft.getX(), bottomLeft.getY(),
        );
        try {
          const sampled = ZXing.GridSamplerInstance.getInstance().sampleGridWithTransform(matrix, dimension, dimension, transform);
          const decoded = reader.decodeSample(sampled);
          const bytes = decoded.getRawBytes();
          return new ZXing.Result(decoded.getText(), bytes, bytes.length * 8, points, ZXing.BarcodeFormat.QR_CODE);
        } catch {
          // A failed candidate is expected; continue with the remaining offsets.
        }
      }
    }
  } catch {
    // Preserve the original ZXing exception so its camera loop keeps retrying.
  }
  throw originalError;
}
