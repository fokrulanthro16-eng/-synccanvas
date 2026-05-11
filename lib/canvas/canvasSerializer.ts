import type { Canvas, FabricObject } from 'fabric';
import type { SerializedFabricObject } from '@/lib/peer/protocol';
import { createId } from '@/lib/utils/ids';

export function assignObjectMeta(
  obj: FabricObject,
  originPeerId: string,
  existingId?: string
): void {
  if (!obj.id) obj.id = existingId ?? createId();
  obj.version = (obj.version ?? 0) + 1;
  obj.originPeerId = originPeerId;
  obj.updatedAt = Date.now();
}

export async function serializeObject(obj: FabricObject): Promise<SerializedFabricObject> {
  const json = obj.toObject(['id', 'version', 'originPeerId', 'updatedAt']);
  return {
    id: obj.id!,
    version: obj.version ?? 1,
    originPeerId: obj.originPeerId ?? '',
    updatedAt: obj.updatedAt ?? Date.now(),
    fabricJson: json as Record<string, unknown>,
  };
}

export async function deserializeObject(
  data: SerializedFabricObject
): Promise<FabricObject | null> {
  const { util } = await import('fabric');
  try {
    const obj = await util.enlivenObjects([data.fabricJson]);
    const fabricObj = obj[0] as FabricObject;
    if (!fabricObj) return null;
    fabricObj.id = data.id;
    fabricObj.version = data.version;
    fabricObj.originPeerId = data.originPeerId;
    fabricObj.updatedAt = data.updatedAt;
    return fabricObj;
  } catch {
    return null;
  }
}

export async function serializeSnapshot(canvas: Canvas): Promise<SerializedFabricObject[]> {
  const objects = canvas.getObjects();
  return Promise.all(objects.filter((o) => o.id).map(serializeObject));
}
