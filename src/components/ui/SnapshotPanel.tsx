import { useState } from 'react';
import { useSnapshotStore } from '../../stores/snapshotStore';
import { useCameraStore } from '../../stores/cameraStore';

export function SnapshotPanel() {
  const snapshots = useSnapshotStore((s) => s.snapshots);
  const saveSnapshot = useSnapshotStore((s) => s.saveSnapshot);
  const loadSnapshot = useSnapshotStore((s) => s.loadSnapshot);
  const deleteSnapshot = useSnapshotStore((s) => s.deleteSnapshot);
  const [name, setName] = useState('');
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cam = useCameraStore.getState();
    saveSnapshot(trimmed, {
      px: cam.position[0], py: cam.position[1], pz: cam.position[2],
      tx: cam.target[0], ty: cam.target[1], tz: cam.target[2],
    });
    setName('');
  };

  const handleLoad = (id: string) => {
    const snap = loadSnapshot(id);
    if (!snap) return;
    useCameraStore.getState().setPosition([snap.camera.px, snap.camera.py, snap.camera.pz]);
    useCameraStore.getState().setTarget([snap.camera.tx, snap.camera.ty, snap.camera.tz]);
    setLoadedId(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div className="p-3 border-b border-gray-700">
      <div className="text-xs text-gray-400 mb-1.5 font-medium">Snapshots</div>
      <div className="flex gap-1 mb-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Snapshot name..."
          className="flex-1 text-xs bg-gray-700 text-white px-2 py-1 rounded outline-none placeholder-gray-500 min-w-0"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-2 py-1 rounded shrink-0"
        >
          Save
        </button>
      </div>
      {snapshots.length === 0 ? (
        <div className="text-xs text-gray-600">No snapshots yet</div>
      ) : (
        <div className="max-h-40 overflow-y-auto space-y-1">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                loadedId === snap.id ? 'bg-blue-600/30 ring-1 ring-blue-400' : 'bg-gray-700/50'
              }`}
            >
              <button
                onClick={() => handleLoad(snap.id)}
                className="flex-1 text-left text-gray-200 hover:text-white truncate"
                title={snap.name}
              >
                {snap.name}
              </button>
              <span className="text-gray-500 text-[10px] shrink-0">
                {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={() => deleteSnapshot(snap.id)}
                className="text-red-400 hover:text-red-300 px-0.5 shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
