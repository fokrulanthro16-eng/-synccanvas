import type { Canvas, FabricObject } from 'fabric';
import type { SerializedFabricObject } from '@/lib/peer/protocol';
import { deserializeObject } from './canvasSerializer';

// Returns the existing object with matching id, or null
function findById(canvas: Canvas, id: string): FabricObject | null {
  return canvas.getObjects().find((o) => o.id === id) ?? null;
}

// Higher lamport + peerId tie-breaker determines winner when versions are equal
function remoteWins(
  existing: FabricObject,
  incoming: SerializedFabricObject,
  remoteLamport: number,
  localLamport: number
): boolean {
  if (incoming.version > (existing.version ?? 0)) return true;
  if (incoming.version < (existing.version ?? 0)) return false;
  // Same version — Lamport tie-breaker
  if (remoteLamport !== localLamport) return remoteLamport > localLamport;
  // Same Lamport — deterministic peerId tie-breaker
  return incoming.originPeerId > (existing.originPeerId ?? '');
}

export async function reconcileAdd(
  canvas: Canvas,
  data: SerializedFabricObject,
  remoteLamport: number,
  localLamport: number
): Promise<void> {
  const existing = findById(canvas, data.id);
  if (existing) {
    if (!remoteWins(existing, data, remoteLamport, localLamport)) return;
    canvas.remove(existing);
  }
  const obj = await deserializeObject(data);
  if (!obj) return;
  canvas.add(obj);
  canvas.renderAll();
}

export async function reconcileModify(
  canvas: Canvas,
  data: SerializedFabricObject,
  remoteLamport: number,
  localLamport: number
): Promise<void> {
  const existing = findById(canvas, data.id);
  if (existing) {
    if (!remoteWins(existing, data, remoteLamport, localLamport)) return;
    canvas.remove(existing);
  }
  const obj = await deserializeObject(data);
  if (!obj) return;
  canvas.add(obj);
  canvas.renderAll();
}

export function reconcileRemove(canvas: Canvas, objectId: string): void {
  const existing = findById(canvas, objectId);
  if (existing) {
    canvas.remove(existing);
    canvas.renderAll();
  }
}

export async function reconcileSnapshot(
  canvas: Canvas,
  objects: SerializedFabricObject[]
): Promise<void> {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  for (const data of objects) {
    const obj = await deserializeObject(data);
    if (obj) canvas.add(obj);
  }
  canvas.renderAll();
}
