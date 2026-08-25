import sharp from 'sharp';

export async function whitePng(path, w = 640, h = 360) {
  await sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } }).png().toFile(path);
  return path;
}

// codex's image_gen sometimes returns a PNG with a transparent background instead of a white one
// (observed on assets/flow/working.png, task-10-report.md). This stands in for that case.
export async function transparentPng(path, w = 640, h = 360) {
  await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png().toFile(path);
  return path;
}
