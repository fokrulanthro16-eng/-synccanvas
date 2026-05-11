import type { FabricObject } from 'fabric';

declare module 'fabric' {
  interface FabricObject {
    id?: string;
    version?: number;
    originPeerId?: string;
    updatedAt?: number;
  }
}
