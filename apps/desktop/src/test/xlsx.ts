/** Lee un .xlsx sin compresión (como los que genera Moneta) para revisar su contenido en pruebas. */
export function readXlsxEntries(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries: Record<string, string> = {};
  let offset = 0;

  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    entries[name] = decoder.decode(bytes.subarray(dataStart, dataStart + size));
    offset = dataStart + size;
  }

  return entries;
}

export function bytesFromDataHref(href: string): Uint8Array {
  const base64 = href.slice(href.indexOf(",") + 1);
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function columnIndex(reference: string): number {
  const letters = reference.replace(/\d+/g, "");
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export type XlsxSheet = { name: string; rows: string[][]; xml: string };

/** Devuelve cada hoja con sus filas como texto (celdas vacías como ""). */
export function readXlsxSheets(bytes: Uint8Array): XlsxSheet[] {
  const entries = readXlsxEntries(bytes);
  const workbook = entries["xl/workbook.xml"] ?? "";
  const names = [...workbook.matchAll(/<sheet name="([^"]*)"/g)].map(([, name]) => unescapeXml(name!));

  return names.map((name, index) => {
    const xml = entries[`xl/worksheets/sheet${index + 1}.xml`] ?? "";
    const rows = [...xml.matchAll(/<row r="\d+"[^>]*>(.*?)<\/row>/g)].map(([, rowXml]) => {
      const cells: string[] = [];
      for (const [, reference, body] of rowXml!.matchAll(/<c r="([A-Z]+\d+)"[^>]*>(.*?)<\/c>/g)) {
        const text = /<t[^>]*>(.*?)<\/t>/.exec(body!)?.[1] ?? /<v>(.*?)<\/v>/.exec(body!)?.[1] ?? "";
        cells[columnIndex(reference!)] = unescapeXml(text);
      }
      return Array.from(cells, (cell) => cell ?? "");
    });
    return { name, rows, xml };
  });
}
