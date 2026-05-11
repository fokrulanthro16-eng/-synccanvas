'use client';

import { useState } from 'react';
import { Copy, Link, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { ConnectionStatus, PeerRole } from '@/lib/peer/protocol';
import { useWhiteboardStore } from '@/store/whiteboardStore';

interface ConnectionPanelProps {
  onCreateHost: () => void;
  onJoinHost: (hostId: string) => void;
}

export default function ConnectionPanel({ onCreateHost, onJoinHost }: ConnectionPanelProps) {
  const { role, localPeerId, connectionStatus, connectedPeers } = useWhiteboardStore();
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!localPeerId) return;
    navigator.clipboard.writeText(localPeerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isConnected = connectionStatus === ConnectionStatus.CONNECTED;
  const isConnecting = connectionStatus === ConnectionStatus.CONNECTING;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4 w-72 space-y-3">
      <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
        {isConnected ? (
          <Wifi size={15} className="text-green-500" />
        ) : (
          <WifiOff size={15} className="text-gray-400" />
        )}
        SyncCanvas
        <span className="ml-auto text-xs font-normal text-gray-400">
          {connectedPeers.length} peer{connectedPeers.length !== 1 ? 's' : ''}
        </span>
      </h2>

      {/* Create host */}
      {role === PeerRole.NONE && (
        <button
          onClick={onCreateHost}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Link size={14} />
          Create Room (Host)
        </button>
      )}

      {/* Host peer ID display */}
      {role === PeerRole.HOST && localPeerId && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Your Room ID (share this):</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span className="flex-1 text-xs font-mono text-gray-700 truncate">{localPeerId}</span>
            <button
              onClick={handleCopy}
              title="Copy"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Copy size={14} />
            </button>
          </div>
          {copied && <p className="text-xs text-green-500">Copied!</p>}
        </div>
      )}

      {/* Join section */}
      {role === PeerRole.NONE && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Or join an existing room:</p>
          <input
            type="text"
            placeholder="Paste Room ID here"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={() => joinId.trim() && onJoinHost(joinId.trim())}
            disabled={!joinId.trim() || isConnecting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <UserPlus size={14} />
            {isConnecting ? 'Joining…' : 'Join Room'}
          </button>
        </div>
      )}

      {/* Status badge */}
      <div
        className={`text-xs text-center py-1 rounded-lg font-medium ${
          isConnected
            ? 'bg-green-50 text-green-600'
            : isConnecting
            ? 'bg-yellow-50 text-yellow-600'
            : 'bg-gray-50 text-gray-400'
        }`}
      >
        {connectionStatus}
      </div>
    </div>
  );
}
