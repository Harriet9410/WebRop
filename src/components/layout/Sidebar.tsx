import { useEffect, useRef, useState } from 'react';
import { ROSConnection } from '../ros/ROSConnection';
import { ModeSelector, AppMode } from '../ui/ModeSelector';
import { ActionPanel } from '../ui/ActionPanel';
import { SnapshotPanel } from '../ui/SnapshotPanel';
import { useRosStore } from '../../stores/rosStore';
import { onMockLog, getMockLog, mockResetMap, mockClearMap } from '../../ros/mock';

interface SidebarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function Sidebar({ mode, onModeChange }: SidebarProps) {
  const isMock = useRosStore((s) => s.isMock);

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-gray-700 shrink-0">
        <h1 className="text-sm font-bold text-white">MRReP / MRHaD</h1>
        <p className="text-xs text-gray-400 mt-0.5">Web Editor</p>
      </div>

      <div className="p-3 border-b border-gray-700 shrink-0">
        <div className="text-xs text-gray-400 mb-1.5 font-medium">ROS Connection</div>
        <ROSConnection />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isMock && <MapSelector />}

        <div className="p-3 border-b border-gray-700">
          <div className="text-xs text-gray-400 mb-1.5 font-medium">Mode</div>
          <ModeSelector mode={mode} onChange={onModeChange} />
        </div>

        <div className="p-3 border-b border-gray-700">
          <div className="text-xs text-gray-400 mb-1.5 font-medium">Actions</div>
          <ActionPanel mode={mode} />
        </div>

        {isMock && <MockLogPanel />}

        <SnapshotPanel />
      </div>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 shrink-0">
        <div>Right-click: Rotate</div>
        <div>Middle-click: Pan</div>
        <div>Scroll: Zoom</div>
      </div>
    </div>
  );
}

function MapSelector() {
  return (
    <div className="p-3 border-b border-gray-700">
      <div className="text-xs text-gray-400 mb-1.5 font-medium">Map</div>
      <div className="space-y-1.5">
        <button
          onClick={mockResetMap}
          className="w-full text-xs bg-yellow-700 hover:bg-yellow-800 text-white px-2 py-1.5 rounded"
        >
          Default Map
        </button>
        <button
          onClick={mockClearMap}
          className="w-full text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1.5 rounded"
        >
          Blank Map
        </button>
      </div>
    </div>
  );
}

function MockLogPanel() {
  const logRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>(() => getMockLog());

  useEffect(() => {
    setLines(getMockLog());
    const unsub = onMockLog((newLog) => {
      setLines(newLog);
      requestAnimationFrame(() => {
        if (logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
      });
    });
    return unsub;
  }, []);

  return (
    <div className="p-3 border-b border-gray-700 flex-1 min-h-0 flex flex-col">
      <div className="text-xs text-purple-400 mb-1.5 font-medium">Mock Log</div>
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 text-xs text-gray-400 font-mono leading-relaxed min-h-0 max-h-48"
      >
        {lines.length === 0 ? (
          <span className="text-gray-600">Waiting for events...</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
          ))
        )}
      </div>
    </div>
  );
}
