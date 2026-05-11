'use client';

import { useWhiteboardStore } from '@/store/whiteboardStore';

export default function PeerStatus() {
  const { role, localPeerId, hostPeerId, connectionStatus, connectedPeers } =
    useWhiteboardStore();

  return (
    <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 space-y-0.5 min-w-[180px]">
      <div className="flex justify-between gap-4">
        <span className="font-medium text-gray-700">Role</span>
        <span>{role}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="font-medium text-gray-700">Status</span>
        <span>{connectionStatus}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="font-medium text-gray-700">Local ID</span>
        <span className="font-mono truncate max-w-[100px]">{localPeerId || '—'}</span>
      </div>
      {hostPeerId && (
        <div className="flex justify-between gap-4">
          <span className="font-medium text-gray-700">Host ID</span>
          <span className="font-mono truncate max-w-[100px]">{hostPeerId}</span>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <span className="font-medium text-gray-700">Peers</span>
        <span>{connectedPeers.length}</span>
      </div>
    </div>
  );
}
