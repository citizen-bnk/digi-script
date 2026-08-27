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
 * A small PNG: a plain background with a darker band across the top, which
 * is enough to look like a scanned page in a thumbnail without shipping a
 * photograph. Standing in for the phone-camera captures the scanning team
 * screens describe.
 */
export function pngBytes(width = 320, height = 440, tint: [number, number, number] = [0x4c, 0x17, 0xd4]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let cursor = 0;
  for (let y = 0; y < height; y++) {
    raw[cursor++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const inBand = y < height * 0.16;
      const edge = x < 6 || x > width - 7 || y < 6 || y > height - 7;
      const [r, g, b] = inBand || edge ? tint : [0xf4, 0xf6, 0xfb];
      raw[cursor++] = r;
      raw[cursor++] = g;
      raw[cursor++] = b;
    }
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
