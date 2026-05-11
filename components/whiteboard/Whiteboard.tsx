'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Canvas, FabricObject } from 'fabric';
import { CanvasTool, ConnectionStatus, MessageType, PeerRole } from '@/lib/peer/protocol';
import type {
  ObjectRemovedPayload,
  ObjectSyncPayload,
  SnapshotPayload,
  SyncEnvelope,
} from '@/lib/peer/protocol';
import { useWhiteboardStore } from '@/store/whiteboardStore';
import { PeerService } from '@/lib/peer/PeerService';
import { createFabricCanvas } from '@/lib/canvas/fabricFactory';
import {
  assignObjectMeta,
  serializeObject,
  serializeSnapshot,
} from '@/lib/canvas/canvasSerializer';
import {
  reconcileAdd,
  reconcileModify,
  reconcileRemove,
  reconcileSnapshot,
} from '@/lib/canvas/canvasReconciler';
import { createId } from '@/lib/utils/ids';
import Toolbar from './Toolbar';
import ConnectionPanel from './ConnectionPanel';
import PeerStatus from './PeerStatus';
import AIPanel from './AIPanel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (e: any) => any;

export default function Whiteboard() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const peerServiceRef = useRef<PeerService | null>(null);
  const isApplyingRemoteRef = useRef(false);

  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);

  const store = useWhiteboardStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  // ─── Build a SyncEnvelope ────────────────────────────────────────────────
  const createEnvelope = useCallback(
    (type: MessageType, payload: SyncEnvelope['payload']): SyncEnvelope => {
      const lamport = storeRef.current.tickLamport();
      return {
        type,
        messageId: createId(),
        senderId: storeRef.current.localPeerId,
        timestamp: Date.now(),
        lamport,
        payload,
      };
    },
    []
  );

  // ─── Handle incoming sync message ────────────────────────────────────────
  const handleIncomingData = useCallback(
    async (envelope: SyncEnvelope, fromPeerId: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const { hasMessageBeenSeen, markMessageSeen, localPeerId, tickLamport, addPeer } =
        storeRef.current;

      if (envelope.senderId === localPeerId) return;
      if (hasMessageBeenSeen(envelope.messageId)) return;
      markMessageSeen(envelope.messageId);
      tickLamport(envelope.lamport);

      isApplyingRemoteRef.current = true;

      try {
        switch (envelope.type) {
          case MessageType.HELLO:
          case MessageType.PEER_JOINED:
            addPeer(fromPeerId);
            break;

          case MessageType.CANVAS_SNAPSHOT_REQUEST: {
            const objects = await serializeSnapshot(canvas);
            const snap = createEnvelope(MessageType.CANVAS_SNAPSHOT, {
              objects,
            } as SnapshotPayload);
            peerServiceRef.current?.sendTo(fromPeerId, snap);
            break;
          }

          case MessageType.CANVAS_SNAPSHOT: {
            const { objects } = envelope.payload as SnapshotPayload;
            await reconcileSnapshot(canvas, objects);
            break;
          }

          case MessageType.OBJECT_ADDED: {
            const { object } = envelope.payload as ObjectSyncPayload;
            await reconcileAdd(canvas, object, envelope.lamport, storeRef.current.lamportClock);
            break;
          }

          case MessageType.OBJECT_MODIFIED: {
            const { object } = envelope.payload as ObjectSyncPayload;
            await reconcileModify(canvas, object, envelope.lamport, storeRef.current.lamportClock);
            break;
          }

          case MessageType.OBJECT_REMOVED: {
            const { objectId } = envelope.payload as ObjectRemovedPayload;
            reconcileRemove(canvas, objectId);
            break;
          }

          case MessageType.OBJECT_CLEAR:
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
            break;

          case MessageType.PING:
            peerServiceRef.current?.sendTo(
              fromPeerId,
              createEnvelope(MessageType.PONG, {})
            );
            break;

          default:
            break;
        }
      } finally {
        isApplyingRemoteRef.current = false;
      }
    },
    [createEnvelope]
  );

  // ─── Initialize Fabric canvas ────────────────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current) return;

    let canvas: Canvas;

    const init = async () => {
      const container = canvasElRef.current!.parentElement!;
      canvas = await createFabricCanvas(
        canvasElRef.current!,
        container.clientWidth,
        container.clientHeight
      );
      fabricRef.current = canvas;

      // path:created fires after pen/eraser strokes
      canvas.on('path:created', async (e) => {
        if (isApplyingRemoteRef.current) return;
        const obj = e.path as FabricObject;
        assignObjectMeta(obj, storeRef.current.localPeerId);
        const serialized = await serializeObject(obj);
        const envelope = createEnvelope(MessageType.OBJECT_ADDED, { object: serialized });
        storeRef.current.markMessageSeen(envelope.messageId);
        peerServiceRef.current?.broadcast(envelope);
      });

      // object:modified fires after move/scale/rotate
      canvas.on('object:modified', async (e) => {
        if (isApplyingRemoteRef.current) return;
        const obj = e.target as FabricObject;
        if (!obj?.id) return;
        assignObjectMeta(obj, storeRef.current.localPeerId, obj.id);
        const serialized = await serializeObject(obj);
        const envelope = createEnvelope(MessageType.OBJECT_MODIFIED, { object: serialized });
        storeRef.current.markMessageSeen(envelope.messageId);
        peerServiceRef.current?.broadcast(envelope);
      });

      // object:removed
      canvas.on('object:removed', (e) => {
        if (isApplyingRemoteRef.current) return;
        const obj = e.target as FabricObject;
        if (!obj?.id) return;
        const envelope = createEnvelope(MessageType.OBJECT_REMOVED, { objectId: obj.id });
        storeRef.current.markMessageSeen(envelope.messageId);
        peerServiceRef.current?.broadcast(envelope);
      });

      // selection tracking for AI panel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('selection:created', (e: any) => {
        setSelectedObject((e.selected?.[0] as FabricObject) ?? null);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('selection:updated', (e: any) => {
        setSelectedObject((e.selected?.[0] as FabricObject) ?? null);
      });
      canvas.on('selection:cleared', () => {
        setSelectedObject(null);
      });
    };

    init();

    const handleResize = () => {
      if (!fabricRef.current || !canvasElRef.current) return;
      const container = canvasElRef.current.parentElement!;
      fabricRef.current.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      fabricRef.current.renderAll();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, [createEnvelope]);

  // ─── Sync tool settings to Fabric ───────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const applyTool = async () => {
      const { PencilBrush } = await import('fabric');
      const { selectedTool, selectedColor, strokeWidth } = storeRef.current;

      switch (selectedTool) {
        case CanvasTool.PEN:
          canvas.isDrawingMode = true;
          canvas.selection = false;
          canvas.freeDrawingBrush = new PencilBrush(canvas);
          canvas.freeDrawingBrush.color = selectedColor;
          canvas.freeDrawingBrush.width = strokeWidth;
          break;

        case CanvasTool.ERASER:
          canvas.isDrawingMode = true;
          canvas.selection = false;
          canvas.freeDrawingBrush = new PencilBrush(canvas);
          canvas.freeDrawingBrush.color = '#ffffff';
          canvas.freeDrawingBrush.width = strokeWidth * 4;
          break;

        case CanvasTool.SELECT:
          canvas.isDrawingMode = false;
          canvas.selection = true;
          break;

        case CanvasTool.RECTANGLE:
        case CanvasTool.CIRCLE:
          canvas.isDrawingMode = false;
          canvas.selection = false;
          break;
      }
    };

    applyTool();
  }, [store.selectedTool, store.selectedColor, store.strokeWidth]);

  // ─── Shape drawing (Rectangle / Circle) ─────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (
      store.selectedTool !== CanvasTool.RECTANGLE &&
      store.selectedTool !== CanvasTool.CIRCLE
    ) {
      return;
    }

    let startX = 0;
    let startY = 0;
    let isDown = false;
    let activeShape: FabricObject | null = null;

    const onMouseDown: AnyHandler = (opt: { scenePoint?: { x: number; y: number }; pointer?: { x: number; y: number } }) => {
      isDown = true;
      const pointer = opt.scenePoint ?? opt.pointer ?? { x: 0, y: 0 };
      startX = pointer.x;
      startY = pointer.y;
    };

    const onMouseMove: AnyHandler = async (opt: { scenePoint?: { x: number; y: number }; pointer?: { x: number; y: number } }) => {
      if (!isDown) return;
      const pointer = opt.scenePoint ?? opt.pointer ?? { x: 0, y: 0 };
      const w = pointer.x - startX;
      const h = pointer.y - startY;

      if (activeShape) {
        isApplyingRemoteRef.current = true;
        canvas.remove(activeShape);
        isApplyingRemoteRef.current = false;
        activeShape = null;
      }

      const { Rect, Ellipse } = await import('fabric');
      const baseOpts = {
        left: w >= 0 ? startX : pointer.x,
        top: h >= 0 ? startY : pointer.y,
        width: Math.abs(w),
        height: Math.abs(h),
        stroke: storeRef.current.selectedColor,
        strokeWidth: storeRef.current.strokeWidth,
        fill: 'transparent',
        selectable: false,
        evented: false,
      };

      activeShape =
        storeRef.current.selectedTool === CanvasTool.RECTANGLE
          ? new Rect(baseOpts)
          : new Ellipse({ ...baseOpts, rx: Math.abs(w) / 2, ry: Math.abs(h) / 2 });

      isApplyingRemoteRef.current = true;
      canvas.add(activeShape);
      isApplyingRemoteRef.current = false;
      canvas.renderAll();
    };

    const onMouseUp: AnyHandler = async () => {
      if (!isDown || !activeShape) {
        isDown = false;
        return;
      }
      isDown = false;
      const shape = activeShape;
      activeShape = null;

      // Make the final shape selectable and evented
      shape.set({ selectable: true, evented: true });
      assignObjectMeta(shape, storeRef.current.localPeerId);
      const serialized = await serializeObject(shape);
      const envelope = createEnvelope(MessageType.OBJECT_ADDED, { object: serialized });
      storeRef.current.markMessageSeen(envelope.messageId);
      peerServiceRef.current?.broadcast(envelope);
      canvas.renderAll();
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [store.selectedTool, createEnvelope]);

  // ─── Clear canvas ────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    isApplyingRemoteRef.current = true;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    isApplyingRemoteRef.current = false;

    const envelope = createEnvelope(MessageType.OBJECT_CLEAR, {});
    storeRef.current.markMessageSeen(envelope.messageId);
    peerServiceRef.current?.broadcast(envelope);
  }, [createEnvelope]);

  // ─── Create host ─────────────────────────────────────────────────────────
  const handleCreateHost = useCallback(async () => {
    store.setConnectionStatus(ConnectionStatus.CONNECTING);
    store.setRole(PeerRole.HOST);

    const svc = new PeerService({
      onOpen: (id) => {
        store.setLocalPeerId(id);
        store.setHostPeerId(id);
        store.setConnectionStatus(ConnectionStatus.CONNECTED);
      },
      onPeerConnected: (peerId) => {
        store.addPeer(peerId);
        const envelope = createEnvelope(MessageType.HELLO, { role: PeerRole.HOST });
        svc.sendTo(peerId, envelope);
      },
      onPeerDisconnected: (peerId) => {
        store.removePeer(peerId);
      },
      onData: handleIncomingData,
      onError: (err) => {
        console.error('[PeerService]', err);
        store.setConnectionStatus(ConnectionStatus.ERROR);
      },
    });

    peerServiceRef.current = svc;
    await svc.createHost();
  }, [store, createEnvelope, handleIncomingData]);

  // ─── Join as guest ───────────────────────────────────────────────────────
  const handleJoinHost = useCallback(
    async (hostId: string) => {
      store.setConnectionStatus(ConnectionStatus.CONNECTING);
      store.setRole(PeerRole.GUEST);
      store.setHostPeerId(hostId);

      const svc = new PeerService({
        onOpen: (id) => {
          store.setLocalPeerId(id);
        },
        onPeerConnected: (peerId) => {
          store.addPeer(peerId);
          store.setConnectionStatus(ConnectionStatus.CONNECTED);

          const hello = createEnvelope(MessageType.HELLO, { role: PeerRole.GUEST });
          svc.sendTo(peerId, hello);

          const snapReq = createEnvelope(MessageType.CANVAS_SNAPSHOT_REQUEST, {});
          svc.sendTo(peerId, snapReq);
        },
        onPeerDisconnected: (peerId) => {
          store.removePeer(peerId);
          if (store.connectedPeers.length === 0) {
            store.setConnectionStatus(ConnectionStatus.DISCONNECTED);
          }
        },
        onData: handleIncomingData,
        onError: (err) => {
          console.error('[PeerService]', err);
          store.setConnectionStatus(ConnectionStatus.ERROR);
        },
      });

      peerServiceRef.current = svc;
      await svc.connectToHost(hostId);
    },
    [store, createEnvelope, handleIncomingData]
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">
      <div className="absolute inset-0">
        <canvas ref={canvasElRef} />
      </div>

      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <Toolbar onClear={handleClear} />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <ConnectionPanel onCreateHost={handleCreateHost} onJoinHost={handleJoinHost} />
      </div>

      <div className="absolute bottom-4 right-4 z-10">
        <PeerStatus />
      </div>

      <div className="absolute bottom-4 left-4 z-10">
        <AIPanel selectedObject={selectedObject} />
      </div>
    </div>
  );
}
