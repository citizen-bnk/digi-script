import { deflateSync } from "node:zlib";

/**
 * Real file bytes for the demo.
 *
 * The seed used to store `Buffer.from(textSample)` — the extracted text
 * standing in for the file. That is fine for exercising categorization and
 * useless for everything downstream: a document viewer opens it and finds a
 * few sentences where a PDF should be, and a thumbnail has nothing to draw.
 * These build genuinely valid files instead, small enough to keep the seed
 * quick and real enough that a browser renders them.
 *
 * Generated rather than committed as binary fixtures so the content matches
 * the document it belongs to — a report card says whose it is.
 */

/** Escapes the characters that would otherwise end a PDF string literal. */
function pdfString(text: string): string {
  return text.replace(/([\\()])/g, "\\$1");
}

/**
 * A one-page A4 PDF carrying a heading and some lines of text.
 *
 * Written out by hand because the alternative is a PDF library for the sake
 * of the demo seed. The fiddly part is the cross-reference table: every
 * offset in it is a byte position into the file, so the objects are laid down
 * first and the table is built from where they actually landed.
 */
export function pdfBytes(heading: string, lines: string[]): Buffer {
  const content = [
    "BT",
    "/F1 16 Tf",
    "56 780 Td",
    `(${pdfString(heading)}) Tj`,
    "/F1 11 Tf",
    ...lines.flatMap((line) => ["0 -22 Td", `(${pdfString(line)}) Tj`]),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

/** A PNG chunk: length, type, payload, CRC over type and payload. */
function pngChunk(type: string, payload: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.byteLength);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), payload]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/**
 * A small PNG that reads as a photographed document rather than a colour
 * swatch: a header band, a portrait box, ruled lines where text would be,
 * and a barcode strip. Standing in for the ID cards, registration forms and
 * certificates the scanning-team screens capture with a phone.
 *
 * Drawn by filling rectangles into a raw RGB buffer — there is no canvas in
 * a server process, and a few rectangles are all a thumbnail needs.
 */
export function pngBytes(
  width = 320,
  height = 440,
  tint: [number, number, number] = [0x4c, 0x17, 0xd4],
): Buffer {
  const paper: [number, number, number] = [0xf7, 0xf8, 0xfc];
  const ink: [number, number, number] = [0xc8, 0xcc, 0xdb];
  const pixels = Buffer.alloc(width * height * 3);

  // Coordinates are derived from a fractional unit, and a pixel offset
  // computed from a fractional row addresses nothing — rounding here is what
  // makes the shapes appear at all.
  const fill = (
    x0: number,
    y0: number,
    w: number,
    h: number,
    [r, g, b]: [number, number, number],
  ) => {
    const left = Math.max(0, Math.round(x0));
    const top = Math.max(0, Math.round(y0));
    const right = Math.min(width, Math.round(x0 + w));
    const bottom = Math.min(height, Math.round(y0 + h));

    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const at = (y * width + x) * 3;
        pixels[at] = r;
        pixels[at + 1] = g;
        pixels[at + 2] = b;
      }
    }
  };

  const unit = width / 100;
  fill(0, 0, width, height, tint); // border, showing as a frame around the page
  fill(unit * 4, unit * 4, width - unit * 8, height - unit * 8, paper);
  fill(unit * 4, unit * 4, width - unit * 8, unit * 14, tint); // title band

  // Portrait box, as on an identity document.
  const photoTop = unit * 22;
  fill(unit * 9, photoTop, unit * 24, unit * 30, ink);

  // Ruled lines beside the portrait, then across the page below it.
  for (let line = 0; line < 4; line++) {
    fill(unit * 38, photoTop + line * unit * 8, unit * 50, unit * 3.5, ink);
  }
  for (let line = 0; line < 5; line++) {
    fill(unit * 9, photoTop + unit * 36 + line * unit * 7, width - unit * 18, unit * 3, ink);
  }

  // Barcode strip: alternating bars of varying width, deterministic so the
  // same document always renders the same way.
  let x = unit * 9;
  for (let bar = 0; x < width - unit * 12; bar++) {
    const barWidth = unit * (bar % 3 === 0 ? 2.5 : 1);
    fill(x, height - unit * 16, barWidth, unit * 8, [0x2a, 0x2f, 0x3d]);
    x += barWidth + unit * 1.5;
  }

  // PNG scanlines each carry a leading filter byte, so the raw buffer is
  // built row by row rather than handed over whole.
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  // 10-12: compression, filter and interlace methods, all zero.

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
