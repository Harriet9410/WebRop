import { useState } from 'react';
import { useRosStore } from '../../stores/rosStore';
import { connect, disconnect } from '../../ros/connection';

export function ROSConnection() {
  const { status, url, setUrl } = useRosStore();
  const [inputUrl, setInputUrl] = useState(url);

  const handleConnect = () => {
    setUrl(inputUrl);
    connect(inputUrl);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const statusColor: Record<string, string> = {
    disconnected: 'bg-gray-400',
    connecting: 'bg-yellow-400',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${statusColor[status] || 'bg-gray-400'}`} />
      <input
        className="bg-gray-700 text-white text-xs px-2 py-1 rounded w-52 outline-none focus:ring-1 focus:ring-blue-400"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
        placeholder="ws://localhost:9090"
      />
      {status === 'connected' ? (
        <button
          onClick={handleDisconnect}
          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={handleConnect}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
        >
          Connect
        </button>
      )}
      <span className="text-xs text-gray-400 capitalize">{status}</span>
    </div>
  );
}
