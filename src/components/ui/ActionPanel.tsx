import { useHRZStore, ZONE_COLORS, ZoneType, ZONE_SPEED } from '../../stores/hrzStore';
import { useHRPStore, SPEED_LEVELS, speedToColor, SegmentSpeed, DEFAULT_SPEED } from '../../stores/hrpStore';
import { useRosStore } from '../../stores/rosStore';
import { useWaypointStore } from '../../stores/waypointStore';
import { useMapStore } from '../../stores/mapStore';
import { useMapEditorStore, MapTool } from '../../stores/mapEditorStore';
import { useUndoStore } from '../../stores/undoStore';
import { useMeasureStore } from '../../stores/measureStore';
import { publishHRZZones, publishHRPPath, publishHRPSpeeds } from '../../ros/connection';
import { mockPublishHRZZones, mockPublishHRPPath, mockStartWaypointNav, mockCancelNav, mockResetMap, mockClearMap } from '../../ros/mock';
import { sceneToRos, dist } from '../../utils/coordinate';
import { checkPathReachability } from '../../utils/pathCheck';
import type { AppMode } from '../ui/ModeSelector';

interface ActionPanelProps {
  mode: AppMode;
}

const mapTools: { key: MapTool; label: string; desc: string }[] = [
  { key: 'wall', label: 'Wall', desc: 'Draw walls (click & drag)' },
  { key: 'erase', label: 'Eraser', desc: 'Erase walls (click & drag)' },
  { key: 'rect', label: 'Rectangle', desc: 'Draw rectangular wall (click & drag)' },
  { key: 'robot', label: 'Place Robot', desc: 'Click to place robot' },
];

export function ActionPanel({ mode }: ActionPanelProps) {
  const hrz = useHRZStore();
  const hrp = useHRPStore();
  const wpStore = useWaypointStore();
  const isMock = useRosStore((s) => s.isMock);
  const isConnected = useRosStore((s) => s.status) === 'connected';
  const editTool = useMapEditorStore((s) => s.tool);
  const brushSize = useMapEditorStore((s) => s.brushSize);

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
      mockPublishHRPPath(rosPoints, hrp.segmentSpeeds);
    } else {
      publishHRPPath(rosPoints);
      publishHRPSpeeds(hrp.segmentSpeeds);
    }
  };

  const handleCheckPath = () => {
    const grid = useMapStore.getState().grid;
    if (!grid || hrp.path.length < 2) return;
    const blocked = checkPathReachability(grid, hrp.path);
    hrp.setBlockedSegments(blocked);
  };

  const handleAutoSpeed = () => {
    const zones = hrz.zones;
    if (zones.length === 0 || hrp.path.length < 2) return;
    useUndoStore.getState().pushUndo();
    const newSpeeds = [...hrp.segmentSpeeds];
    for (let i = 0; i < hrp.path.length - 1; i++) {
      const midX = (hrp.path[i].x + hrp.path[i + 1].x) / 2;
      const midZ = (hrp.path[i].z + hrp.path[i + 1].z) / 2;
      let matchedSpeed: number | null = null;
      for (const zone of zones) {
        if (pointInPolygon(midX, midZ, zone.vertices)) {
          const zoneSpeed = ZONE_SPEED[zone.zoneType];
          if (zone.zoneType === 'forbidden') {
            matchedSpeed = 0.05;
          } else if (matchedSpeed === null || zoneSpeed < matchedSpeed) {
            matchedSpeed = zoneSpeed;
          }
        }
      }
      if (matchedSpeed !== null) {
        newSpeeds[i] = matchedSpeed;
      }
    }
    useHRPStore.setState({ segmentSpeeds: newSpeeds });
  };

  const calcTotalDist = () => {
    let total = 0;
    for (let i = 0; i < hrp.path.length - 1; i++) {
      total += dist(hrp.path[i], hrp.path[i + 1]);
    }
    return total;
  };

  const calcEstTime = () => {
    let totalSec = 0;
    for (let i = 0; i < hrp.path.length - 1; i++) {
      const d = dist(hrp.path[i], hrp.path[i + 1]);
      const speed = hrp.segmentSpeeds[i] || DEFAULT_SPEED;
      totalSec += speed > 0 ? d / speed : 0;
    }
    if (totalSec < 60) return `${totalSec.toFixed(0)}s`;
    const min = Math.floor(totalSec / 60);
    const sec = Math.round(totalSec % 60);
    return `${min}m${sec}s`;
  };

  const handleStartNav = () => {
    if (isMock) {
      mockStartWaypointNav();
    } else {
      const wps = wpStore.waypoints;
      if (wps.length > 0) {
        const first = wps[0];
        publishNavGoal(first.x, first.z);
        wpStore.setCurrentWaypointIdx(0);
        wpStore.setNavigating(true);
      }
    }
  };

  const handleCancelNav = () => {
    if (isMock) {
      mockCancelNav();
    } else {
      wpStore.clearNav();
    }
  };

  const canPublish = isConnected;

  return (
    <div className="space-y-3">
      {mode === 'navigate' && (
        <>
          <div className="text-xs text-gray-400">
            Left-click on the map to add waypoints. Robot will navigate to each in order.
          </div>
          {wpStore.waypoints.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-300 font-medium">
                Waypoints ({wpStore.waypoints.length})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {wpStore.waypoints.map((wp, i) => (
                  <div
                    key={wp.id}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      wpStore.navigating && i === wpStore.currentWaypointIdx
                        ? 'bg-pink-600/40 ring-1 ring-pink-400'
                        : wpStore.navigating && i < wpStore.currentWaypointIdx
                        ? 'bg-gray-600/30 opacity-50'
                        : 'bg-gray-700/50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-gray-300 flex-1 truncate">
                      ({wp.x.toFixed(1)}, {wp.z.toFixed(1)})
                    </span>
                    {!wpStore.navigating && (
                      <>
                        <button
                          onClick={() => wpStore.moveWaypoint(wp.id, 'up')}
                          disabled={i === 0}
                          className="text-gray-400 hover:text-white disabled:opacity-30 px-0.5"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => wpStore.moveWaypoint(wp.id, 'down')}
                          disabled={i === wpStore.waypoints.length - 1}
                          className="text-gray-400 hover:text-white disabled:opacity-30 px-0.5"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => wpStore.removeWaypoint(wp.id)}
                          className="text-red-400 hover:text-red-300 px-0.5"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {wpStore.navigating ? (
            <>
              <div className="text-xs text-pink-400">
                Navigating: waypoint {wpStore.currentWaypointIdx + 1}/{wpStore.waypoints.length}
              </div>
              <button
                onClick={handleCancelNav}
                className="w-full text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded"
              >
                Cancel Navigation
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartNav}
                disabled={wpStore.waypoints.length === 0}
                className="w-full text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded"
              >
                Start Navigation ({wpStore.waypoints.length} waypoints)
              </button>
              {wpStore.waypoints.length > 0 && (
                <button
                  onClick={() => wpStore.clearWaypoints()}
                  className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded"
                >
                  Clear All Waypoints
                </button>
              )}
            </>
          )}
        </>
      )}
      {mode === 'mapedit' && isMock && (
        <>
          <div className="text-xs text-gray-400">Edit the map by drawing walls and obstacles.</div>
          <div className="space-y-1">
            {mapTools.map((t) => (
              <button
                key={t.key}
                onClick={() => useMapEditorStore.getState().setTool(t.key)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded ${
                  editTool === t.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <span className="ml-1 text-gray-400">- {t.desc}</span>
              </button>
            ))}
          </div>
          {(editTool === 'wall' || editTool === 'erase') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Brush:</span>
              <input
                type="range"
                min={1}
                max={15}
                value={brushSize}
                onChange={(e) => useMapEditorStore.getState().setBrushSize(Number(e.target.value))}
                className="flex-1 h-1 accent-blue-500"
              />
              <span className="text-xs text-gray-300 w-4 text-right">{brushSize}</span>
            </div>
          )}
          <button
            onClick={mockResetMap}
            className="w-full text-xs bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-1.5 rounded"
          >
            Reset Default Map
          </button>
          <button
            onClick={mockClearMap}
            className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded"
          >
            Clear All Walls
          </button>
        </>
      )}
      {mode === 'hrz' && (
        <>
          <div className="text-xs text-gray-400">
            Left-click to add vertices. Click the first vertex (yellow) to close. Hold Shift to snap to 0.5m grid.
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-300 font-medium">Zone Type</div>
            <div className="flex gap-1">
              {(['forbidden', 'slow', 'charging'] as ZoneType[]).map((zt) => (
                <button
                  key={zt}
                  onClick={() => hrz.setCurrentZoneType(zt)}
                  className={`flex-1 text-[10px] px-1.5 py-1 rounded ${
                    hrz.currentZoneType === zt ? 'ring-2 ring-white' : ''
                  }`}
                  style={{ backgroundColor: ZONE_COLORS[zt] + '99', color: '#fff' }}
                >
                  {zt}
                </button>
              ))}
            </div>
          </div>
          {hrz.zones.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {hrz.zones.map((z) => (
                <div key={z.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-700/50">
                  <span
                    className="w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: ZONE_COLORS[z.zoneType] }}
                  />
                  <span className="text-gray-300 flex-1">{z.zoneType}</span>
                  <select
                    value={z.zoneType}
                    onChange={(e) => hrz.setZoneType(z.id, e.target.value as ZoneType)}
                    className="text-[10px] bg-gray-600 text-white px-1 py-0.5 rounded"
                  >
                    <option value="forbidden">forbidden</option>
                    <option value="slow">slow</option>
                    <option value="charging">charging</option>
                  </select>
                  <button
                    onClick={() => { useUndoStore.getState().pushUndo(); hrz.removeZone(z.id); }}
                    className="text-red-400 hover:text-red-300 px-0.5"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={handlePublishHRZ}
            disabled={!canPublish || hrz.zones.length === 0}
            className="w-full text-xs bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded"
          >
            {isMock ? 'Apply Zones to Map' : 'Publish HRZ Zones'} ({hrz.zones.length})
          </button>
          <button
            onClick={hrz.cancelDrawing}
            className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded"
          >
            Cancel Drawing
          </button>
          <button
            onClick={() => { useUndoStore.getState().pushUndo(); hrz.clearAll(); }}
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
            {isMock
              ? 'Draw a path by clicking & dragging. Robot will follow with obstacle avoidance. Hold Shift to snap to 0.5m grid.'
              : 'Draw a path by clicking & dragging, then publish to ROS. Hold Shift to snap to 0.5m grid.'}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => useMeasureStore.getState().startMeasure()}
              className="flex-1 text-[10px] bg-cyan-700/60 hover:bg-cyan-600/60 text-cyan-200 px-1.5 py-1 rounded"
            >
              Measure
            </button>
            <button
              onClick={() => useMeasureStore.getState().clearMeasure()}
              className="flex-1 text-[10px] bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 px-1.5 py-1 rounded"
            >
              Clear Measure
            </button>
          </div>
          {hrp.path.length >= 2 && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-300 font-medium">Segment Speeds</div>
              <div className="text-xs text-gray-500">
                Click segment on map or below to cycle speed. Yellow=slow → Green=fast.
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {hrp.segmentSpeeds.map((speed, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      hrp.selectedSegment === i
                        ? 'bg-blue-600/40 ring-1 ring-blue-400'
                        : 'bg-gray-700/50'
                    }`}
                  >
                    <span className="text-gray-300 w-14 shrink-0">Seg {i + 1}</span>
                    <input
                      type="range"
                      min={0}
                      max={SPEED_LEVELS.length - 1}
                      value={SPEED_LEVELS.indexOf(speed as any) === -1 ? 4 : SPEED_LEVELS.indexOf(speed as any)}
                      onChange={(e) => hrp.setSegmentSpeed(i, SPEED_LEVELS[Number(e.target.value)])}
                      className="flex-1 h-1 accent-green-500"
                    />
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 min-w-[52px] text-center"
                      style={{ backgroundColor: (hrp.blockedSegments[i] ? '#dc2626' : speedToColor(speed)) + 'cc', color: '#fff' }}
                    >
                      {hrp.blockedSegments[i] ? 'BLOCKED' : `${speed.toFixed(1)} m/s`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => hrp.segmentSpeeds.forEach((_, i) => hrp.setSegmentSpeed(i, SPEED_LEVELS[SPEED_LEVELS.length - 1]))}
                  className="flex-1 text-[10px] bg-green-700/60 hover:bg-green-600/60 text-green-200 px-1.5 py-1 rounded"
                >
                  All {SPEED_LEVELS[SPEED_LEVELS.length - 1]} m/s
                </button>
                <button
                  onClick={() => hrp.segmentSpeeds.forEach((_, i) => hrp.setSegmentSpeed(i, SPEED_LEVELS[0]))}
                  className="flex-1 text-[10px] bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 px-1.5 py-1 rounded"
                >
                  All {SPEED_LEVELS[0]} m/s
                </button>
              </div>
            </div>
          )}
          <button
            onClick={handleCheckPath}
            disabled={hrp.path.length < 2}
            className="w-full text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded"
          >
            Check Path ({hrp.path.length} pts)
          </button>
          {hrp.blockedSegments.length > 0 && (
            <div className="text-xs">
              {hrp.blockedSegments.some((b) => b) ? (
                <span className="text-red-400">
                  Blocked segments: {hrp.blockedSegments.map((b, i) => b ? i + 1 : null).filter(Boolean).join(', ')}
                </span>
              ) : (
                <span className="text-green-400">All segments reachable</span>
              )}
            </div>
          )}
          <button
            onClick={handlePublishHRP}
            disabled={!canPublish || hrp.path.length < 2}
            className="w-full text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded"
          >
            {isMock ? 'Follow Drawn Path' : 'Publish HRP Path'} ({hrp.path.length} pts)
          </button>
          <button
            onClick={() => { useUndoStore.getState().pushUndo(); hrp.clearPath(); }}
            className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded"
          >
            Clear Path
          </button>
          <div className="text-xs text-gray-500">
            Points: {hrp.path.length} | Segments: {hrp.segmentSpeeds.length}
          </div>
          {hrp.path.length >= 2 && (
            <div className="space-y-1">
              <button
                onClick={handleAutoSpeed}
                className="w-full text-[10px] bg-purple-700/60 hover:bg-purple-600/60 text-purple-200 px-1.5 py-1 rounded"
              >
                Auto Speed (Zone Match)
              </button>
              <div className="text-xs text-gray-400">
                Est. time: <span className="text-cyan-400 font-mono">{calcEstTime()}</span>
                {' | '}Total: <span className="text-cyan-400 font-mono">{calcTotalDist().toFixed(1)}m</span>
              </div>
            </div>
          )}
         </>
       )}
     </div>
   );
}

function pointInPolygon(px: number, pz: number, vertices: { x: number; z: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, zi = vertices[i].z;
    const xj = vertices[j].x, zj = vertices[j].z;
    if (((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}
