import { useHRZStore } from '../../stores/hrzStore';
import { useHRPStore } from '../../stores/hrpStore';
import { useRosStore } from '../../stores/rosStore';
import { publishHRZZones, publishHRPPath } from '../../ros/connection';
import { mockPublishHRZZones, mockPublishHRPPath } from '../../ros/mock';
import { sceneToRos } from '../../utils/coordinate';
import type { AppMode } from '../ui/ModeSelector';

interface ActionPanelProps {
  mode: AppMode;
}

export function ActionPanel({ mode }: ActionPanelProps) {
  const hrz = useHRZStore();
  const hrp = useHRPStore();
  const isMock = useRosStore((s) => s.isMock);
  const isConnected = useRosStore((s) => s.status) === 'connected';

  const handlePublishHRZ = () => {
    const data = hrz.zones.map((z) => ({
      id: z.id,
      vertices: z.vertices.map((v) => sceneToRos(v.x, v.z)),
    }));
    const json = JSON.stringify(data);
    if (isMock) {
      mockPublishHRZZones(json);
    } else {
      publishHRZZones(json);
    }
  };

  const handlePublishHRP = () => {
    if (hrp.path.length < 2) return;
    const rosPoints = hrp.path.map((p) => sceneToRos(p.x, p.z));
    if (isMock) {
      mockPublishHRPPath(rosPoints);
    } else {
      publishHRPPath(rosPoints);
    }
  };

  const canPublish = isConnected;

  return (
    <div className="space-y-3">
      {mode === 'hrz' && (
        <>
          <div className="text-xs text-gray-400">
            Left-click to add vertices. Click the first vertex (yellow) to close.
          </div>
          <button
            onClick={handlePublishHRZ}
            disabled={!canPublish || hrz.zones.length === 0}
            className="w-full text-xs bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded"
          >
            Publish HRZ Zones ({hrz.zones.length})
          </button>
          <button
            onClick={hrz.cancelDrawing}
            className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded"
          >
            Cancel Drawing
          </button>
          <button
            onClick={hrz.clearAll}
            className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded"
          >
            Clear All Zones
          </button>
          <div className="text-xs text-gray-500">
            Zones: {hrz.zones.length} | Drawing: {hrz.currentVertices.length} pts
          </div>
        </>
      )}
      {mode === 'hrp' && (
        <>
          <div className="text-xs text-gray-400">
            Left-click & drag to draw a reference path. Release to finish.
          </div>
          <button
            onClick={handlePublishHRP}
            disabled={!canPublish || hrp.path.length < 2}
            className="w-full text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded"
          >
            Publish HRP Path
          </button>
          <button
            onClick={hrp.clearPath}
            className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded"
          >
            Clear Path
          </button>
          <div className="text-xs text-gray-500">
            Points: {hrp.path.length}
          </div>
        </>
      )}
      {mode === 'navigate' && (
        <div className="text-xs text-gray-400">
          Right-click to rotate. Middle-click to pan. Scroll to zoom.
        </div>
      )}
    </div>
  );
}
