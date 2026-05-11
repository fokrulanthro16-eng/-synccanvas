import { create } from 'zustand';
import { CanvasTool, ConnectionStatus, PeerRole } from '@/lib/peer/protocol';

interface WhiteboardState {
  // Identity
  role: PeerRole;
  localPeerId: string;
  hostPeerId: string;

  // Network
  connectionStatus: ConnectionStatus;
  connectedPeers: string[];

  // Canvas tools
  selectedTool: CanvasTool;
  selectedColor: string;
  strokeWidth: number;

  // CRDT primitives
  lamportClock: number;
  seenMessageIds: Set<string>;

  // Actions
  setRole: (role: PeerRole) => void;
  setLocalPeerId: (id: string) => void;
  setHostPeerId: (id: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addPeer: (peerId: string) => void;
  removePeer: (peerId: string) => void;
  setTool: (tool: CanvasTool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  tickLamport: (remote?: number) => number;
  markMessageSeen: (messageId: string) => void;
  hasMessageBeenSeen: (messageId: string) => boolean;
  resetSession: () => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  role: PeerRole.NONE,
  localPeerId: '',
  hostPeerId: '',
  connectionStatus: ConnectionStatus.IDLE,
  connectedPeers: [],
  selectedTool: CanvasTool.PEN,
  selectedColor: '#000000',
  strokeWidth: 3,
  lamportClock: 0,
  seenMessageIds: new Set(),

  setRole: (role) => set({ role }),
  setLocalPeerId: (id) => set({ localPeerId: id }),
  setHostPeerId: (id) => set({ hostPeerId: id }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  addPeer: (peerId) =>
    set((s) => ({
      connectedPeers: s.connectedPeers.includes(peerId)
        ? s.connectedPeers
        : [...s.connectedPeers, peerId],
    })),

  removePeer: (peerId) =>
    set((s) => ({
      connectedPeers: s.connectedPeers.filter((p) => p !== peerId),
    })),

  setTool: (tool) => set({ selectedTool: tool }),
  setColor: (color) => set({ selectedColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),

  tickLamport: (remote?: number) => {
    const next = Math.max(get().lamportClock, remote ?? 0) + 1;
    set({ lamportClock: next });
    return next;
  },

  markMessageSeen: (messageId) =>
    set((s) => {
      const next = new Set(s.seenMessageIds);
      next.add(messageId);
      return { seenMessageIds: next };
    }),

  hasMessageBeenSeen: (messageId) => get().seenMessageIds.has(messageId),

  resetSession: () =>
    set({
      role: PeerRole.NONE,
      localPeerId: '',
      hostPeerId: '',
      connectionStatus: ConnectionStatus.IDLE,
      connectedPeers: [],
      lamportClock: 0,
      seenMessageIds: new Set(),
    }),
}));
