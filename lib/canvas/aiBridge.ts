// AI Bridge — rule-based recognition now, TensorFlow.js model-ready pipeline for later.
// Use dynamic imports for TF.js so the browser-only library never runs during SSR.

import type { FabricObject, Canvas } from 'fabric';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ShapePrediction {
  label: string;      // e.g. "circle", "rectangle"
  confidence: number; // 0–1
}

export interface PathPoints {
  x: number[];
  y: number[];
}

export interface AIAnalysisResult {
  predictedShape: string;
  confidence: number;   // 0–100
  message: string;
  recognitionMode: 'rule-based' | 'model';
  objectId: string | undefined;
  objectType: string;
  boundingBox: { left: number; top: number; width: number; height: number } | null;
}

export interface TFStatus {
  tfReady: boolean;
  modelLoaded: boolean;
  statusMessage: string;
}

// ─── TensorFlow.js singleton state ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tfModel: any = null;
let _tfReady = false;

/**
 * Lazily initialize TensorFlow.js. Safe to call multiple times.
 * Only runs in the browser (call from useEffect, never at module level).
 */
export async function initTF(): Promise<void> {
  if (_tfReady) return;
  try {
    await import('@tensorflow/tfjs');
    _tfReady = true;
  } catch {
    _tfReady = false;
  }
}

/**
 * Load a TF.js LayersModel from a URL (e.g. a model.json hosted alongside weight shards).
 * Returns true on success, false on failure.
 */
export async function loadModel(modelUrl: string): Promise<boolean> {
  try {
    const tf = await import('@tensorflow/tfjs');
    _tfModel = await tf.loadLayersModel(modelUrl);
    return true;
  } catch {
    return false;
  }
}

export function isModelLoaded(): boolean {
  return _tfModel !== null;
}

export function getTFStatus(): TFStatus {
  if (!_tfReady) {
    return {
      tfReady: false,
      modelLoaded: false,
      statusMessage: 'TensorFlow.js is not initialized.',
    };
  }
  if (!_tfModel) {
    return {
      tfReady: true,
      modelLoaded: false,
      statusMessage: 'TensorFlow.js is connected, but no trained model is loaded yet.',
    };
  }
  return {
    tfReady: true,
    modelLoaded: true,
    statusMessage: 'TensorFlow.js model is loaded and ready.',
  };
}

// ─── TensorFlow.js pipeline ───────────────────────────────────────────────────

/**
 * Rasterize the bounding-box region of a Fabric object into a 28×28 grayscale
 * TF tensor [1, 28, 28, 1], normalised 0–1. Returns null if TF is not ready or
 * the object has no area.
 */
export async function objectToTensor(
  object: FabricObject,
  canvas: Canvas
): Promise<unknown> {
  if (!_tfReady) return null;
  try {
    const tf = await import('@tensorflow/tfjs');
    const bb = object.getBoundingRect?.();
    if (!bb || bb.width === 0 || bb.height === 0) return null;

    // Grab the lower (drawing) canvas element from the Fabric instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricEl = ((canvas as any).lowerCanvasEl ?? (canvas as any).getElement?.()) as HTMLCanvasElement | null;
    if (!fabricEl) return null;

    const offscreen = document.createElement('canvas');
    offscreen.width = 28;
    offscreen.height = 28;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 28, 28);
    ctx.drawImage(fabricEl, bb.left, bb.top, bb.width, bb.height, 0, 0, 28, 28);

    // Convert to [1, 28, 28, 1] float32 tensor normalised 0–1.
    // fromPixels accepts an HTMLCanvasElement directly, avoiding Uint8ClampedArray issues.
    const tensor = tf.browser
      .fromPixels(offscreen, 1)
      .toFloat()
      .div(255)
      .expandDims(0);

    return tensor;
  } catch {
    return null;
  }
}

/**
 * Run the loaded LayersModel on a tensor produced by objectToTensor.
 * Returns null if no model is loaded or inference fails.
 * Class order matches common quick-draw-style datasets.
 */
export async function predictWithModel(tensor: unknown): Promise<ShapePrediction | null> {
  if (!_tfModel || !tensor) return null;
  try {
    const tf = await import('@tensorflow/tfjs');
    const classes = ['circle', 'rectangle', 'triangle', 'line', 'unknown'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prediction = _tfModel.predict(tensor) as ReturnType<typeof tf.tensor>;
    const data = await (prediction as { data: () => Promise<Float32Array> }).data();
    prediction.dispose();

    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > bestVal) { bestVal = data[i]; bestIdx = i; }
    }
    return { label: classes[bestIdx] ?? 'unknown', confidence: bestVal };
  } catch {
    return null;
  }
}

// ─── Rule-based helpers ───────────────────────────────────────────────────────

// Duck-type check: ActiveSelection and Group expose getObjects().
// Checking both common Fabric 7 type strings and a method presence guard
// keeps this robust across minor Fabric API differences.
function isMultiObjectSelection(obj: FabricObject): boolean {
  const type = (obj.type ?? '').toLowerCase().replace('-', '');
  return (
    (type === 'activeselection' || type === 'group') &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (obj as any).getObjects === 'function'
  );
}

function classifyMultiSelection(
  width: number,
  height: number
): { predictedShape: string; confidence: number; message: string } {
  const ratio = width > 0 && height > 0 ? width / height : 0;

  if (ratio > 4.5) {
    return {
      predictedShape: 'horizontal line or wide shape',
      confidence: 60,
      message: 'Combined bounding box is much wider than tall.',
    };
  }

  if (ratio >= 1.2 && ratio <= 4.5) {
    return {
      predictedShape: 'rectangle',
      confidence: 70,
      message: 'Multiple selected paths form a rectangle-like bounding box.',
    };
  }

  if (ratio >= 0.65 && ratio < 1.2) {
    return {
      predictedShape: 'square or circle/oval',
      confidence: 70,
      message: 'Multiple selected paths form a roughly square bounding box — likely a square or circle/oval.',
    };
  }

  if (ratio >= 0.22 && ratio < 0.65) {
    return {
      predictedShape: 'vertical rectangle',
      confidence: 70,
      message: 'Multiple selected paths form a tall bounding box — likely a vertical rectangle.',
    };
  }

  // ratio < 0.22 — strongly vertical
  return {
    predictedShape: 'vertical line or tall shape',
    confidence: 60,
    message: 'Combined bounding box is much taller than wide.',
  };
}

function classifyFreehandPath(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _object: Record<string, any>,
  width: number,
  height: number
): { predictedShape: string; confidence: number; message: string } {
  // Bounding-box ratio is the primary signal — it works whether the path is
  // open or closed, so rough hand-drawn shapes are handled correctly.
  //
  // Band layout (ratio = width / height):
  //   > 4.5          → horizontal line / stroke
  //   1.35 – 4.5     → landscape rectangle
  //   0.65 – 1.35    → circle or oval  (roughly square bbox)
  //   0.22 – 0.65    → portrait rectangle
  //   < 0.22         → vertical line / stroke
  const ratio = width > 0 && height > 0 ? width / height : 0;

  if (ratio > 4.5) {
    return {
      predictedShape: 'line or freehand path',
      confidence: 65,
      message: 'Width is much larger than height — likely a horizontal line or freehand stroke.',
    };
  }

  if (ratio >= 1.35 && ratio <= 4.5) {
    return {
      predictedShape: 'rectangle',
      confidence: 70,
      message: 'Bounding box ratio suggests a rough rectangle.',
    };
  }

  if (ratio >= 0.65 && ratio < 1.35) {
    return {
      predictedShape: 'circle or oval',
      confidence: 70,
      message: 'Bounding box ratio suggests a rough circle or oval.',
    };
  }

  if (ratio >= 0.22 && ratio < 0.65) {
    return {
      predictedShape: 'vertical rectangle',
      confidence: 70,
      message: 'Bounding box ratio suggests a rough vertical rectangle.',
    };
  }

  // ratio < 0.22 — strongly vertical
  return {
    predictedShape: 'vertical line or freehand path',
    confidence: 65,
    message: 'Height is much larger than width — likely a vertical line or freehand stroke.',
  };
}

// ─── Main analysis entry point ────────────────────────────────────────────────

export function analyzeSelectedObject(object: FabricObject): AIAnalysisResult {
  const bb = object.getBoundingRect?.();
  const boundingBox = bb
    ? {
        left: Math.round(bb.left),
        top: Math.round(bb.top),
        width: Math.round(bb.width),
        height: Math.round(bb.height),
      }
    : null;
  const objectType = object.type ?? 'unknown';
  const objectId = object.id;

  // Multi-object selection (ActiveSelection / Group)
  if (isMultiObjectSelection(object)) {
    const w = bb?.width ?? 0;
    const h = bb?.height ?? 0;
    const cls = classifyMultiSelection(w, h);
    return { ...cls, recognitionMode: 'rule-based', objectId, objectType, boundingBox };
  }

  // Fabric primitive — Rect
  if (objectType === 'rect') {
    return {
      predictedShape: 'rectangle',
      confidence: 100,
      message: 'Fabric Rect object — exact match.',
      recognitionMode: 'rule-based',
      objectId,
      objectType,
      boundingBox,
    };
  }

  // Fabric primitive — Ellipse / Circle
  if (objectType === 'ellipse' || objectType === 'circle') {
    return {
      predictedShape: 'circle',
      confidence: 100,
      message: 'Fabric Ellipse/Circle object — exact match.',
      recognitionMode: 'rule-based',
      objectId,
      objectType,
      boundingBox,
    };
  }

  // Freehand path — heuristic analysis
  if (objectType === 'path') {
    const w = bb?.width ?? 0;
    const h = bb?.height ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls = classifyFreehandPath(object as Record<string, any>, w, h);
    return { ...cls, recognitionMode: 'rule-based', objectId, objectType, boundingBox };
  }

  return {
    predictedShape: 'unknown',
    confidence: 0,
    message: `No heuristic available for object type "${objectType}".`,
    recognitionMode: 'rule-based',
    objectId,
    objectType,
    boundingBox,
  };
}

// ─── Legacy stubs (kept for backwards compat) ─────────────────────────────────

export function extractPathPoints(obj: FabricObject): PathPoints | null {
  void obj;
  return null;
}

export function extractBoundingBox(obj: FabricObject): DOMRect | null {
  const br = obj.getBoundingRect?.();
  if (!br) return null;
  return new DOMRect(br.left, br.top, br.width, br.height);
}

export async function objectToImageData(
  canvas: Canvas,
  obj: FabricObject
): Promise<ImageData | null> {
  void canvas;
  void obj;
  return null;
}

export async function predictShape(
  _imageData: ImageData
): Promise<ShapePrediction | null> {
  return null;
}
