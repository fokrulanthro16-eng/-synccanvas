import type { Canvas } from 'fabric';

export async function createFabricCanvas(
  el: HTMLCanvasElement,
  width: number,
  height: number
): Promise<Canvas> {
  const { Canvas: FabricCanvas, PencilBrush } = await import('fabric');

  const canvas = new FabricCanvas(el, {
    width,
    height,
    backgroundColor: '#ffffff',
    isDrawingMode: true,
  });

  const brush = new PencilBrush(canvas);
  brush.color = '#000000';
  brush.width = 3;
  canvas.freeDrawingBrush = brush;

  return canvas;
}

export async function resizeCanvas(canvas: Canvas, width: number, height: number) {
  canvas.setDimensions({ width, height });
  canvas.renderAll();
}
