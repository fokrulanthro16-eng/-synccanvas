import type { DataConnection } from 'peerjs';
import type { SyncEnvelope } from './protocol';

export interface PeerServiceCallbacks {
  onOpen: (peerId: string) => void;
  onPeerConnected: (peerId: string, conn: DataConnection) => void;
  onPeerDisconnected: (peerId: string) => void;
  onData: (data: SyncEnvelope, fromPeerId: string) => void;
  onError: (err: Error) => void;
}

export class PeerService {
  private peer: import('peerjs').Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private callbacks: PeerServiceCallbacks;

  constructor(callbacks: PeerServiceCallbacks) {
    this.callbacks = callbacks;
  }

  // ─── Create a host peer (random ID assigned by PeerJS server) ─────────────
  async createHost(): Promise<string> {
    const { Peer } = await import('peerjs');
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      this.peer = peer;

      peer.on('open', (id) => {
        this.callbacks.onOpen(id);
        resolve(id);
      });

      peer.on('connection', (conn) => this._setupConnection(conn));
      peer.on('error', (err) => {
        this.callbacks.onError(err as Error);
        reject(err);
      });
    });
  }

  // ─── Guest connects to an existing host ───────────────────────────────────
  async connectToHost(hostId: string): Promise<void> {
    const { Peer } = await import('peerjs');
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      this.peer = peer;

      peer.on('open', (id) => {
        this.callbacks.onOpen(id);
        const conn = peer.connect(hostId, { reliable: true });
        this._setupConnection(conn);

        // Also listen for incoming connections (mesh topology)
        peer.on('connection', (incomingConn) => this._setupConnection(incomingConn));

        conn.on('open', () => resolve());
        conn.on('error', (err) => reject(err));
      });

      peer.on('connection', (conn) => this._setupConnection(conn));
      peer.on('error', (err) => {
        this.callbacks.onError(err as Error);
        reject(err);
      });
    });
  }

  // ─── Wire up a DataConnection ──────────────────────────────────────────────
  private _setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.callbacks.onPeerConnected(conn.peer, conn);
    });

    conn.on('data', (raw) => {
      this.callbacks.onData(raw as SyncEnvelope, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.callbacks.onPeerDisconnected(conn.peer);
    });

    conn.on('error', (err) => {
      this.callbacks.onError(err as Error);
    });
  }

  // ─── Send to a specific peer ───────────────────────────────────────────────
  sendTo(peerId: string, envelope: SyncEnvelope): void {
    const conn = this.connections.get(peerId);
    if (conn?.open) conn.send(envelope);
  }

  // ─── Broadcast to all connected peers ─────────────────────────────────────
  broadcast(envelope: SyncEnvelope, excludePeerId?: string): void {
    for (const [peerId, conn] of this.connections) {
      if (peerId === excludePeerId) continue;
      if (conn.open) conn.send(envelope);
    }
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.connections.keys());
  }

  getLocalPeerId(): string | undefined {
    return this.peer?.id ?? undefined;
  }

  destroy(): void {
    this.peer?.destroy();
    this.peer = null;
    this.connections.clear();
  }
}
