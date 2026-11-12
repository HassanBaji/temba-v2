/** The image types Clerk accepts for a profile image. */
const PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const VECTOR_LONG_SIDE = 1024;
const RASTER_MAX_LONG_SIDE = 2048;

export function isProfilePhotoType(type: string) {
  return PROFILE_PHOTO_TYPES.has(type === "image/jpg" ? "image/jpeg" : type);
}

function isVector(file: { type: string; name: string }) {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

export function pngFileName(name: string) {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base === "" ? "photo" : base}.png`;
}

/**
 * The canvas size a picked image is redrawn at. An SVG often has no intrinsic
 * size, so it is drawn at a fixed long side; a raster image keeps its own size
 * up to a cap.
 */
export function rasterSize(
  natural: { width: number; height: number },
  vector: boolean,
) {
  const width = natural.width > 0 ? natural.width : 1;
  const height = natural.height > 0 ? natural.height : 1;
  const longSide = Math.max(width, height);
  const target = vector
    ? VECTOR_LONG_SIDE
    : Math.min(longSide, RASTER_MAX_LONG_SIDE);
  const scale = target / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image could not be decoded"));
    image.src = url;
  });
}

async function redrawAsPng(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const vector = isVector(file);
    const natural =
      image.naturalWidth > 0 && image.naturalHeight > 0
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : { width: VECTOR_LONG_SIDE, height: VECTOR_LONG_SIDE };
    const { width, height } = rasterSize(natural, vector);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    return blob
      ? new File([blob], pngFileName(file.name), { type: "image/png" })
      : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The file to send to Clerk for a picked photo. Clerk rejects anything but
 * JPEG, PNG, GIF and WebP, so any other image the browser can decode (an SVG,
 * a BMP, an AVIF) is redrawn as a PNG first. `null` means it cannot be used.
 */
export async function profilePhotoUploadFile(file: File) {
  if (isProfilePhotoType(file.type)) {
    return file;
  }
  return redrawAsPng(file);
}
