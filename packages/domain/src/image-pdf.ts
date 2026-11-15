/**
 * A one-page PDF holding one JPEG, edge to edge. Both Apps already render a
 * page to an image, so a few bytes of PDF around it make a file that prints
 * and pins, with no PDF library on either App.
 */

/** A4 in PDF points. */
export const A4_POINTS = { width: 595.28, height: 841.89 } as const;

function ascii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function points(value: number) {
  return (Math.round(value * 100) / 100).toString();
}

export function jpegToPdf(
  jpeg: Uint8Array,
  image: { width: number; height: number },
  page: { width: number; height: number } = A4_POINTS,
): Uint8Array<ArrayBuffer> {
  const content = `q ${points(page.width)} 0 0 ${points(page.height)} 0 0 cm /Im0 Do Q`;
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (bytes: Uint8Array) => {
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: Uint8Array[]) => {
    offsets[id] = length;
    push(ascii(`${id} 0 obj\n`));
    body.forEach(push);
    push(ascii("\nendobj\n"));
  };

  push(ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"));
  object(1, [ascii("<< /Type /Catalog /Pages 2 0 R >>")]);
  object(2, [ascii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")]);
  object(3, [
    ascii(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${points(page.width)} ${points(page.height)}] ` +
        "/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>",
    ),
  ]);
  object(4, [
    ascii(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
  ]);
  object(5, [
    ascii(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    ),
    jpeg,
    ascii("\nendstream"),
  ]);

  const xref = length;
  const entries = offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  push(
    ascii(
      `xref\n0 ${offsets.length}\n0000000000 65535 f \n${entries}` +
        `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
    ),
  );

  const out = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
