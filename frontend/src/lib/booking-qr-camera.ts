type CameraControls = { stop: () => void };

type CameraOptions = {
  video: HTMLVideoElement;
  openStream: () => Promise<MediaStream>;
  decode: (stream: MediaStream, onResult: (value: string) => void) => Promise<CameraControls>;
  onScan: (value: string) => void;
  onError: () => void;
};

export function startBookingQrCamera({ video, openStream, decode, onScan, onError }: CameraOptions): () => void {
  let active = true;
  let stream: MediaStream | undefined;
  let controls: CameraControls | undefined;
  let streamStopped = false;
  let controlsStopped = false;

  const stop = () => {
    active = false;
    if (controls && !controlsStopped) {
      controlsStopped = true;
      controls.stop();
    }
    if (stream && !streamStopped) {
      streamStopped = true;
      stream.getTracks().forEach((track) => track.stop());
    }
    if (stream && video.srcObject === stream) video.srcObject = null;
  };

  void (async () => {
    try {
      stream = await openStream();
      if (!active) { stop(); return; }
      controls = await decode(stream, (value) => {
        if (!active) return;
        stop();
        onScan(value);
      });
      if (!active) stop();
    } catch {
      const shouldReport = active;
      stop();
      if (shouldReport) onError();
    }
  })();

  return stop;
}
