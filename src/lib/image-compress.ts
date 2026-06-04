const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export async function maybeCompressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 500_000) return file;
  if (file.type === "image/gif") return file;

  try {
    return await compress(file);
  } catch {
    return file;
  }
}

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fit(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas 2D context niet beschikbaar");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob faalde"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function fit(w: number, h: number): { width: number; height: number } {
  if (w <= MAX_DIMENSION && h <= MAX_DIMENSION) return { width: w, height: h };
  const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}
