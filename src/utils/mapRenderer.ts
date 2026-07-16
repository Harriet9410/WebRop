export interface OccupancyGridData {
  width: number;
  height: number;
  resolution: number;
  originX: number;
  originY: number;
  data: number[];
}

const UNKNOWN = 205;
const FREE = 0;
const OCCUPIED = 254;

export function renderMapToCanvas(
  canvas: HTMLCanvasElement,
  grid: OccupancyGridData
): void {
  const { width, height, data } = grid;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imgData = ctx.createImageData(width, height);
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    let gray: number;
    // 兼容两套占用栅格取值：标准 ROS(0=自由 / 100=占据 / -1=未知) 与 mock(0/254/205)
    if (val < 0 || val === UNKNOWN) {
      gray = 128;            // 未知 → 中灰（先判，免得被占据分支吃掉）
    } else if (val === FREE) {
      gray = 254;            // 自由 → 近白
    } else if (val >= 50) {  // 占据(墙/实体)：含 real 100 / mock 254 → 纯黑
      gray = 0;
    } else {
      gray = 254 - val * 2;  // 1~49 过渡
    }
    const srcRow = Math.floor(i / width);
    const srcCol = i % width;
    const dstRow = height - 1 - srcRow;
    const dstIdx = dstRow * width + srcCol;
    imgData.data[dstIdx * 4] = gray;
    imgData.data[dstIdx * 4 + 1] = gray;
    imgData.data[dstIdx * 4 + 2] = gray;
    imgData.data[dstIdx * 4 + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}
