// ─── Enumerations ─────────────────────────────────────────────────────────────

export enum MessageType {
  HELLO = 'HELLO',
  PEER_JOINED = 'PEER_JOINED',
  CANVAS_SNAPSHOT_REQUEST = 'CANVAS_SNAPSHOT_REQUEST',
  CANVAS_SNAPSHOT = 'CANVAS_SNAPSHOT',
  OBJECT_ADDED = 'OBJECT_ADDED',
  OBJECT_MODIFIED = 'OBJECT_MODIFIED',
  OBJECT_REMOVED = 'OBJECT_REMOVED',
  OBJECT_CLEAR = 'OBJECT_CLEAR',
  CURSOR_UPDATE = 'CURSOR_UPDATE',
  PING = 'PING',
  PONG = 'PONG',
}

export enum PeerRole {
  HOST = 'HOST',
  GUEST = 'GUEST',
  NONE = 'NONE',
}

export enum CanvasTool {
  PEN = 'PEN',
  ERASER = 'ERASER',
  SELECT = 'SELECT',
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
}

export enum ConnectionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

// ─── Serialized Fabric Object ──────────────────────────────────────────────────

export interface SerializedFabricObject {
  id: string;
  version: number;
  originPeerId: string;
  updatedAt: number;
  fabricJson: Record<string, unknown>;
}

// ─── Payloads ──────────────────────────────────────────────────────────────────

export interface HelloPayload {
  role: PeerRole;
}

export interface PeerJoinedPayload {
  newPeerId: string;
}

export interface ObjectSyncPayload {
  object: SerializedFabricObject;
}

export interface ObjectRemovedPayload {
  objectId: string;
}

export interface SnapshotPayload {
  objects: SerializedFabricObject[];
}

export interface CursorPayload {
  x: number;
  y: number;
}

export type SyncPayload =
  | HelloPayload
  | PeerJoinedPayload
  | ObjectSyncPayload
  | ObjectRemovedPayload
  | SnapshotPayload
  | CursorPayload
  | Record<string, unknown>;

// ─── Envelope ─────────────────────────────────────────────────────────────────

export interface SyncEnvelope {
  type: MessageType;
  messageId: string;
  senderId: string;
  timestamp: number;
  lamport: number;
  payload: SyncPayload;
}
