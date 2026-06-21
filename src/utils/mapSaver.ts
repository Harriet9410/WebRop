import { OccupancyGridData } from './mapRenderer';

const UNKNOWN = 205;

export interface SavedMapMeta {
  name: string;
  timestamp: number;
  width: number;
  height: number;
  resolution: number;
  originX: number;
  originY: number;
}

export function gridToPgm(grid: OccupancyGridData): Uint8Array {
  const { width, height, data } = grid;
  const pgmHeader = `P5\n${width} ${height}\n255\n`;
  const headerBytes = new TextEncoder().encode(pgmHeader);
  const pixels = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    let gray: number;
    if (val === UNKNOWN) {
      gray = 205;
    } else if (val >= 0 && val <= 254) {
      gray = val;
    } else {
      gray = 205;
    }
    const srcRow = Math.floor(i / width);
    const srcCol = i % width;
    const dstRow = height - 1 - srcRow;
    pixels[dstRow * width + srcCol] = gray;
  }

  const result = new Uint8Array(headerBytes.length + pixels.length);
  result.set(headerBytes, 0);
  result.set(pixels, headerBytes.length);
  return result;
}

export function gridToYaml(grid: OccupancyGridData, pgmFileName: string): string {
  return `image: ${pgmFileName}
resolution: ${grid.resolution}
origin: [${grid.originX}, ${grid.originY}, 0.0]
negate: 0
occupied_thresh: 0.65
free_thresh: 0.196
`;
}

export function downloadBlob(data: Uint8Array | string, filename: string, mimeType: string): void {
  const blobData = typeof data === 'string' ? data : new Uint8Array(data);
  const blob = new Blob([blobData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function saveMapToFiles(grid: OccupancyGridData, mapName: string): void {
  const safeName = mapName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'map';
  const pgmName = `${safeName}.pgm`;
  const yamlName = `${safeName}.yaml`;

  const pgmData = gridToPgm(grid);
  downloadBlob(pgmData, pgmName, 'image/x-portable-graymap');

  const yamlData = gridToYaml(grid, pgmName);
  downloadBlob(yamlData, yamlName, 'text/yaml');
}

export function getMapMetaList(): SavedMapMeta[] {
  try {
    const raw = localStorage.getItem('mrrep-web-saved-maps');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addMapMeta(meta: SavedMapMeta): void {
  const list = getMapMetaList();
  list.unshift(meta);
  if (list.length > 20) list.length = 20;
  localStorage.setItem('mrrep-web-saved-maps', JSON.stringify(list));
}

export function removeMapMeta(timestamp: number): void {
  const list = getMapMetaList().filter((m) => m.timestamp !== timestamp);
  localStorage.setItem('mrrep-web-saved-maps', JSON.stringify(list));
}
