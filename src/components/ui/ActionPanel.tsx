import { useHRZStore, ZONE_COLORS, ZONE_OUTLINE_COLORS, ZoneType, ZONE_SPEED, computeZoneArea } from '../../stores/hrzStore';
import { useHRPStore, SPEED_LEVELS, speedToColor, DEFAULT_SPEED } from '../../stores/hrpStore';
import { useRosStore } from '../../stores/rosStore';
import { useMapStore } from '../../stores/mapStore';
import { useMapEditorStore, MapTool } from '../../stores/mapEditorStore';
import { useUndoStore } from '../../stores/undoStore';
import { useLabelStore } from '../../stores/labelStore';
import { useA11yStore } from '../../stores/a11yStore';
import { useFleetStore, FormationType, RobotType, ROBOT_TYPES, ROBOT_TYPE_LABELS, WaypointConfig, DEFAULT_WP_SPEED, DEFAULT_WP_WAIT } from '../../stores/fleetStore';
import { usePoseSyncStore, startPoseSync, stopPoseSync } from '../../stores/poseSyncStore';
import { useWpSelectStore } from '../../stores/wpSelectStore';
import { TaskPanel } from './TaskPanel';
import { t } from '../../i18n';
import { publishHRZZones, publishHRPPath, publishHRPSpeeds, publishNavGoal } from '../../ros/connection';
import { mockPublishHRZZones, mockPublishHRPPath, mockStartWaypointNav, mockCancelNav, mockResetMap, mockClearMap } from '../../ros/mock';
import { sceneToRos, dist } from '../../utils/coordinate';
import { checkPathReachability } from '../../utils/pathCheck';
import { useState } from 'react';
import type { AppMode } from '../ui/ModeSelector';

interface ActionPanelProps {
  mode: AppMode;
}

export function ActionPanel({ mode }: ActionPanelProps) {
  const [newRobotType, setNewRobotType] = useState<RobotType>('car');
  const hrzZones = useHRZStore((s) => s.zones);
  const hrzCurrentVertices = useHRZStore((s) => s.currentVertices);
  const hrpPath = useHRPStore((s) => s.path);
  const hrpSegmentSpeeds = useHRPStore((s) => s.segmentSpeeds);
  const hrpBlockedSegments = useHRPStore((s) => s.blockedSegments);
  const hrpSelectedSegment = useHRPStore((s) => s.selectedSegment);
  const isMock = useRosStore((s) => s.isMock);
  const isConnected = useRosStore((s) => s.status) === 'connected';
  const editTool = useMapEditorStore((s) => s.tool);
  const brushSize = useMapEditorStore((s) => s.brushSize);
  const labels = useLabelStore((s) => s.labels);
  const locale = useA11yStore((s) => s.locale);
  const fleetRobots = useFleetStore((s) => s.robots);
  const activeRobotId = useFleetStore((s) => s.activeRobotId);
  const formation = useFleetStore((s) => s.formation);
  const formationSpacing = useFleetStore((s) => s.formationSpacing);
  const poseSyncEnabled = usePoseSyncStore((s) => s.enabled);
  const poseSyncUrl = usePoseSyncStore((s) => s.serverUrl);

  const mapTools: { key: MapTool; label: string; desc: string }[] = [
    { key: 'wall', label: t('Wall', locale), desc: t('Draw walls (click & drag)', locale) },
    { key: 'erase', label: t('Eraser', locale), desc: t('Erase walls (click & drag)', locale) },
    { key: 'rect', label: t('Rectangle', locale), desc: t('Draw rectangular wall (click & drag)', locale) },
    { key: 'robot', label: t('Place Robot', locale), desc: t('Click to place robot', locale) },
  ];

  const handlePublishHRZ = () => {
    const zones = useHRZStore.getState().zones;
    const data = zones.map((z) => ({
      id: z.id,
      name: z.name,
      zoneType: z.zoneType,
      vertices: z.vertices.map((v) => sceneToRos(v.x, v.z)),
    }));
    const json = JSON.stringify(data);
    if (isMock) mockPublishHRZZones(json);
    else publishHRZZones(json);
  };

  const handlePublishHRP = () => {
    const path = useHRPStore.getState().path;
    const speeds = useHRPStore.getState().segmentSpeeds;
    if (path.length < 2) return;
    const rosPoints = path.map((p) => sceneToRos(p.x, p.z));
    if (isMock) mockPublishHRPPath(rosPoints, speeds);
    else { publishHRPPath(rosPoints); publishHRPSpeeds(speeds); }
  };

  const handleCheckPath = () => {
    const grid = useMapStore.getState().grid;
    const path = useHRPStore.getState().path;
    if (!grid || path.length < 2) return;
    const blocked = checkPathReachability(grid, path);
    useHRPStore.getState().setBlockedSegments(blocked);
  };

  const handleAutoSpeed = () => {
    const zones = useHRZStore.getState().zones;
    const path = useHRPStore.getState().path;
    const speeds = useHRPStore.getState().segmentSpeeds;
    if (zones.length === 0 || path.length < 2) return;
    useUndoStore.getState().pushUndo();
    const newSpeeds = [...speeds];
    for (let i = 0; i < path.length - 1; i++) {
      const midX = (path[i].x + path[i + 1].x) / 2;
      const midZ = (path[i].z + path[i + 1].z) / 2;
      let matchedSpeed: number | null = null;
      for (const zone of zones) {
        if (pointInPolygon(midX, midZ, zone.vertices)) {
          const zoneSpeed = ZONE_SPEED[zone.zoneType];
          if (zone.zoneType === 'forbidden') matchedSpeed = 0.05;
          else if (matchedSpeed === null || zoneSpeed < matchedSpeed) matchedSpeed = zoneSpeed;
        }
      }
      if (matchedSpeed !== null) newSpeeds[i] = matchedSpeed;
    }
    useHRPStore.setState({ segmentSpeeds: newSpeeds });
  };

  const calcTotalDist = () => {
    let total = 0;
    for (let i = 0; i < hrpPath.length - 1; i++) total += dist(hrpPath[i], hrpPath[i + 1]);
    return total;
  };

  const calcEstTime = () => {
    let totalSec = 0;
    for (let i = 0; i < hrpPath.length - 1; i++) {
      const d = dist(hrpPath[i], hrpPath[i + 1]);
      const speed = hrpSegmentSpeeds[i] || DEFAULT_SPEED;
      totalSec += speed > 0 ? d / speed : 0;
    }
    if (totalSec < 60) return `${totalSec.toFixed(0)}s`;
    const min = Math.floor(totalSec / 60);
    const sec = Math.round(totalSec % 60);
    return `${min}m${sec}s`;
  };

  const handleStartNav = () => {
    if (isMock) { mockStartWaypointNav(); }
    else {
      const fleet = useFleetStore.getState();
      const bot = fleet.robots.find((r) => r.id === fleet.activeRobotId);
      if (bot && bot.waypoints.length > 0) {
        publishNavGoal(bot.waypoints[0].x, bot.waypoints[0].z);
        fleet.setCurrentWaypointIdx(fleet.activeRobotId, 0);
        fleet.setNavigating(fleet.activeRobotId, true);
      }
    }
  };

  const handleCancelNav = () => {
    if (isMock) mockCancelNav();
    else useFleetStore.getState().clearNav(useFleetStore.getState().activeRobotId);
  };

  const canPublish = isConnected;

  return (
    <div className="space-y-3" role="region" aria-label={t('Actions', locale)}>
      <div className="space-y-1">
        <div className="text-xs text-gray-300 font-medium">Fleet</div>
        <div className="flex items-center gap-1">
          <select
            value={activeRobotId}
            onChange={(e) => useFleetStore.getState().setActiveRobot(e.target.value)}
            className="flex-1 text-[10px] bg-gray-700 text-white px-1 py-1 rounded cursor-pointer"
            aria-label="Select robot"
          >
            {fleetRobots.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({t(ROBOT_TYPE_LABELS[r.robotType], locale)})</option>
            ))}
          </select>
          <button onClick={() => useFleetStore.getState().addRobot(undefined, newRobotType)} className="text-[10px] bg-green-700/60 hover:bg-green-600/60 text-green-200 px-1.5 py-1 rounded" aria-label="Add robot">+</button>
          {fleetRobots.length > 1 && (
            <button onClick={() => useFleetStore.getState().removeRobot(activeRobotId)} className="text-[10px] bg-red-700/60 hover:bg-red-600/60 text-red-200 px-1.5 py-1 rounded" aria-label="Remove robot">−</button>
          )}
        </div>
        <div className="text-xs text-gray-400">Robots: {fleetRobots.length}</div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">{t('Type:', locale)}</span>
          <select
            value={newRobotType}
            onChange={(e) => setNewRobotType(e.target.value as RobotType)}
            className="flex-1 text-[10px] bg-gray-700 text-white px-1 py-0.5 rounded cursor-pointer"
          >
            {ROBOT_TYPES.map((rt) => (
              <option key={rt} value={rt}>{t(ROBOT_TYPE_LABELS[rt], locale)}</option>
            ))}
          </select>
        </div>
        {fleetRobots.find((r) => r.id === activeRobotId) && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">{t('Active type:', locale)}</span>
            <div className="flex gap-0.5">
              {ROBOT_TYPES.map((rt) => (
                <button
                  key={rt}
                  onMouseDown={(e) => { e.stopPropagation(); useFleetStore.getState().setRobotType(activeRobotId, rt); }}
                  className={`text-[10px] px-1 py-0.5 rounded cursor-pointer ${fleetRobots.find((r) => r.id === activeRobotId)?.robotType === rt ? 'bg-blue-600 text-white font-bold' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                >
                  {t(ROBOT_TYPE_LABELS[rt], locale)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {fleetRobots.length > 1 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-300 font-medium">Formation</div>
          <div className="flex gap-1">
            {(['line', 'column', 'v', 'circle'] as FormationType[]).map((f) => (
              <button
                key={f}
                onClick={() => useFleetStore.getState().setFormation(f)}
                className={`flex-1 text-[10px] px-1 py-0.5 rounded cursor-pointer ${formation === f ? 'bg-blue-600 text-white font-bold' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
              >
                {f === 'v' ? 'V' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Spacing:</span>
            <input type="range" min={3} max={20} value={formationSpacing * 10} onChange={(e) => useFleetStore.getState().setFormationSpacing(Number(e.target.value) / 10)} className="flex-1 h-1 accent-blue-500" />
            <span className="text-[10px] text-gray-300 w-6">{formationSpacing.toFixed(1)}m</span>
          </div>
        </div>
      )}
      <div className="space-y-1">
        <div className="text-xs text-gray-300 font-medium">Pose Sync</div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={poseSyncUrl}
            onChange={(e) => usePoseSyncStore.getState().setServerUrl(e.target.value)}
            className="flex-1 text-[10px] bg-gray-700 text-white px-1.5 py-1 rounded min-w-0"
            placeholder="ws://host:9091"
          />
          <button
            onClick={() => poseSyncEnabled ? stopPoseSync() : startPoseSync(poseSyncUrl)}
            className={`text-[10px] px-1.5 py-1 rounded cursor-pointer ${poseSyncEnabled ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
          >
            {poseSyncEnabled ? 'Stop' : 'Sync'}
          </button>
        </div>
      </div>
      {mode === 'navigate' && (() => {
        const activeBot = fleetRobots.find((r) => r.id === activeRobotId);
        if (!activeBot) return null;
        return (
        <>
          <div className="text-xs text-gray-400">
            {t('Left-click waypoint to select & edit. Drag to move. Click map to add.', locale)}
          </div>
          {activeBot.waypoints.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-300 font-medium">
                {t('Waypoints', locale)} ({activeBot.waypoints.length})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5" role="list" aria-label={t('Waypoints', locale)}>
                {activeBot.waypoints.map((wp, i) => (
                  <WaypointItem
                    key={wp.id}
                    wp={wp}
                    index={i}
                    robotId={activeRobotId}
                    robotColor={activeBot.color}
                    isNavigating={activeBot.navigating}
                    currentIdx={activeBot.currentWaypointIdx}
                    totalWps={activeBot.waypoints.length}
                    locale={locale}
                  />
                ))}
              </div>
            </div>
          )}
          <SelectedWaypointEditor locale={locale} />
          {activeBot.navigating ? (
            <>
              <div className="text-xs text-pink-400">
                {t('Navigating: waypoint', locale)} {activeBot.currentWaypointIdx + 1}/{activeBot.waypoints.length}
              </div>
              <button onClick={handleCancelNav} className="w-full text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded" aria-label={t('Cancel Navigation', locale)}>
                {t('Cancel Navigation', locale)}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleStartNav} disabled={activeBot.waypoints.length === 0} className="w-full text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded" aria-label={t('Start Navigation', locale)}>
                {t('Start Navigation', locale)} ({activeBot.waypoints.length} {t('waypoints', locale)})
              </button>
              {activeBot.waypoints.length > 0 && (
                <button onClick={() => useFleetStore.getState().clearWaypoints(activeRobotId)} className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded">
                  {t('Clear All Waypoints', locale)}
                </button>
              )}
            </>
          )}
          <div className="border-t border-gray-700 pt-2 space-y-1">
            <div className="text-xs text-gray-300 font-medium">{t('Map Labels', locale)}</div>
            <div className="text-xs text-gray-500">{t('Double-click map to add label', locale)}</div>
            {labels.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {labels.map((l) => (
                  <div key={l.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-700/50">
                    <span className="text-gray-300 flex-1 truncate">{l.text}</span>
                    <button onClick={() => useLabelStore.getState().removeLabel(l.id)} className="text-red-400 hover:text-red-300 px-0.5" aria-label="Remove label">✕</button>
                  </div>
                ))}
              </div>
            )}
            {labels.length > 0 && (
              <button onClick={() => useLabelStore.getState().clearAll()} className="w-full text-[10px] bg-red-700/60 hover:bg-red-600/60 text-red-200 px-1.5 py-1 rounded">
                {t('Clear All Labels', locale)}
              </button>
            )}
          </div>
        </>
        );
      })()}
      {mode === 'mapedit' && isMock && (
        <>
          <div className="text-xs text-gray-400">{t('Edit the map by drawing walls and obstacles.', locale)}</div>
          <div className="space-y-1">
            {mapTools.map((mt) => (
              <button key={mt.key} onClick={() => useMapEditorStore.getState().setTool(mt.key)} className={`w-full text-left text-xs px-2 py-1.5 rounded ${editTool === mt.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} aria-label={mt.label}>
                <span className="font-medium">{mt.label}</span>
                <span className="ml-1 text-gray-400">- {mt.desc}</span>
              </button>
            ))}
          </div>
          {(editTool === 'wall' || editTool === 'erase') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{t('Brush:', locale)}</span>
              <input type="range" min={1} max={15} value={brushSize} onChange={(e) => useMapEditorStore.getState().setBrushSize(Number(e.target.value))} className="flex-1 h-1 accent-blue-500" aria-label="Brush size" />
              <span className="text-xs text-gray-300 w-4 text-right">{brushSize}</span>
            </div>
          )}
          <button onClick={mockResetMap} className="w-full text-xs bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-1.5 rounded">{t('Reset Default Map', locale)}</button>
          <button onClick={mockClearMap} className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded">{t('Clear All Walls', locale)}</button>
        </>
      )}
      {mode === 'relocate' && (
        <>
          <div className="text-xs text-gray-300 font-medium">{t('2D Pose Estimate', locale)}</div>
          <div className="text-xs text-gray-400">{t('Click & drag to set pose', locale)}</div>
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">{t('Click:', locale)}</span> {t('Set position', locale)}
            <br />
            <span className="text-gray-400">{t('Drag:', locale)}</span> {t('Set orientation', locale)}
          </div>
        </>
      )}
      {mode === 'hrz' && (
        <>
          <div className="text-xs text-gray-400">
            {t('Left-click to add vertices. Click the first vertex (yellow) to close. Hold Shift to snap to 0.5m grid.', locale)}
          </div>
          <div className="flex gap-1 text-[10px]">
            {(['forbidden', 'slow', 'charging'] as ZoneType[]).map((zt) => (
              <span key={zt} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: ZONE_COLORS[zt] + '33', border: `1px solid ${ZONE_OUTLINE_COLORS[zt]}88` }}>
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: ZONE_COLORS[zt] }} />
                <span style={{ color: ZONE_COLORS[zt] }}>{t(zt, locale)}</span>
                <span className="text-gray-500">{ZONE_SPEED[zt]}m/s</span>
              </span>
            ))}
          </div>
          {hrzZones.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {hrzZones.map((z, zi) => {
                const area = computeZoneArea(z.vertices);
                return (
                  <div key={z.id} className="text-xs px-2 py-1.5 rounded bg-gray-700/50 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: ZONE_COLORS[z.zoneType] }} />
                      <input
                        type="text"
                        value={z.name || `Zone ${zi + 1}`}
                        onChange={(e) => useHRZStore.getState().renameZone(z.id, e.target.value)}
                        className="flex-1 text-[10px] bg-transparent text-gray-200 border-b border-transparent hover:border-gray-500 focus:border-blue-400 outline-none min-w-0"
                        aria-label={t('Zone name', locale)}
                      />
                      <span className="text-[10px] text-gray-500 shrink-0">{area.toFixed(2)}m²</span>
                      <button onClick={() => { useUndoStore.getState().pushUndo(); useHRZStore.getState().removeZone(z.id); }} className="text-red-400 hover:text-red-300 px-0.5 shrink-0" aria-label="Remove zone">✕</button>
                    </div>
                    <div className="flex gap-1">
                      {(['forbidden', 'slow', 'charging'] as ZoneType[]).map((zt) => (
                        <button key={zt} type="button" onMouseDown={(e) => { e.stopPropagation(); useUndoStore.getState().pushUndo(); useHRZStore.getState().setZoneType(z.id, zt); }} className={`flex-1 text-[10px] px-1 py-0.5 rounded cursor-pointer select-none ${z.zoneType === zt ? 'ring-2 ring-white font-bold' : 'opacity-50 hover:opacity-90'}`} style={{ backgroundColor: ZONE_COLORS[zt] + 'cc', color: '#fff' }} aria-label={t(zt, locale)} aria-pressed={z.zoneType === zt}>
                          {t(zt, locale)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={handlePublishHRZ} disabled={!canPublish || hrzZones.length === 0} className="w-full text-xs bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded" aria-label={isMock ? t('Apply Zones to Map', locale) : t('Publish HRZ Zones', locale)}>
            {isMock ? t('Apply Zones to Map', locale) : t('Publish HRZ Zones', locale)} ({hrzZones.length})
          </button>
          <button onClick={() => useHRZStore.getState().cancelDrawing()} className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded">{t('Cancel Drawing', locale)}</button>
          <button onClick={() => { useUndoStore.getState().pushUndo(); useHRZStore.getState().clearAll(); }} className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded">{t('Clear All Zones', locale)}</button>
          <div className="text-xs text-gray-500">
            {t('Zones:', locale)} {hrzZones.length} | {t('Drawing:', locale)} {hrzCurrentVertices.length} {t('pts', locale)}
          </div>
        </>
      )}
      {mode === 'hrp' && (
        <>
          <div className="text-xs text-gray-400">
            {isMock
              ? t('Draw a path by clicking & dragging. Robot will follow with obstacle avoidance. Hold Shift to snap to 0.5m grid.', locale)
              : t('Draw a path by clicking & dragging, then publish to ROS. Hold Shift to snap to 0.5m grid.', locale)}
          </div>
          {hrpPath.length >= 2 && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-300 font-medium">{t('Segment Speeds', locale)}</div>
              <div className="text-xs text-gray-500">{t('Click segment on map or below to cycle speed. Yellow=slow → Green=fast.', locale)}</div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {hrpSegmentSpeeds.map((speed, i) => (
                  <div key={i} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${hrpSelectedSegment === i ? 'bg-blue-600/40 ring-1 ring-blue-400' : 'bg-gray-700/50'}`}>
                    <span className="text-gray-300 w-14 shrink-0">{t('Seg', locale)} {i + 1}</span>
                    <input type="range" min={0} max={SPEED_LEVELS.length - 1} value={SPEED_LEVELS.indexOf(speed as any) === -1 ? 4 : SPEED_LEVELS.indexOf(speed as any)} onChange={(e) => useHRPStore.getState().setSegmentSpeed(i, SPEED_LEVELS[Number(e.target.value)])} className="flex-1 h-1 accent-green-500" aria-label={`Segment ${i + 1} speed`} />
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 min-w-[52px] text-center" style={{ backgroundColor: (hrpBlockedSegments[i] ? '#dc2626' : speedToColor(speed)) + 'cc', color: '#fff' }}>
                      {hrpBlockedSegments[i] ? t('BLOCKED', locale) : `${speed.toFixed(1)} m/s`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => hrpSegmentSpeeds.forEach((_, i) => useHRPStore.getState().setSegmentSpeed(i, SPEED_LEVELS[SPEED_LEVELS.length - 1]))} className="flex-1 text-[10px] bg-green-700/60 hover:bg-green-600/60 text-green-200 px-1.5 py-1 rounded">
                  {t('All', locale)} {SPEED_LEVELS[SPEED_LEVELS.length - 1]} m/s
                </button>
                <button onClick={() => hrpSegmentSpeeds.forEach((_, i) => useHRPStore.getState().setSegmentSpeed(i, SPEED_LEVELS[0]))} className="flex-1 text-[10px] bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 px-1.5 py-1 rounded">
                  {t('All', locale)} {SPEED_LEVELS[0]} m/s
                </button>
              </div>
            </div>
          )}
          <button onClick={handleCheckPath} disabled={hrpPath.length < 2} className="w-full text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded">
            {t('Check Path', locale)} ({hrpPath.length} {t('pts', locale)})
          </button>
          {hrpBlockedSegments.length > 0 && (
            <div className="text-xs">
              {hrpBlockedSegments.some((b) => b) ? (
                <span className="text-red-400">{t('Blocked segments:', locale)} {hrpBlockedSegments.map((b, i) => b ? i + 1 : null).filter(Boolean).join(', ')}</span>
              ) : (
                <span className="text-green-400">{t('All segments reachable', locale)}</span>
              )}
            </div>
          )}
          <button onClick={handlePublishHRP} disabled={!canPublish || hrpPath.length < 2} className="w-full text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded">
            {isMock ? t('Follow Drawn Path', locale) : t('Publish HRP Path', locale)} ({hrpPath.length} {t('pts', locale)})
          </button>
          <button onClick={() => { useUndoStore.getState().pushUndo(); useHRPStore.getState().clearPath(); }} className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded">{t('Clear Path', locale)}</button>
          <div className="text-xs text-gray-500">{t('Points:', locale)} {hrpPath.length} | {t('Segments:', locale)} {hrpSegmentSpeeds.length}</div>
          {hrpPath.length >= 2 && (
            <PathStatsPanel
              path={hrpPath}
              segmentSpeeds={hrpSegmentSpeeds}
              blockedSegments={hrpBlockedSegments}
              locale={locale}
              onAutoSpeed={handleAutoSpeed}
              estTime={calcEstTime()}
              totalDist={calcTotalDist()}
            />
          )}
        </>
      )}
      {mode === 'tasks' && <TaskPanel />}
    </div>
  );
}

function pointInPolygon(px: number, pz: number, vertices: { x: number; z: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, zi = vertices[i].z;
    const xj = vertices[j].x, zj = vertices[j].z;
    if (((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

function PathStatsPanel({ path, segmentSpeeds, blockedSegments, locale, onAutoSpeed, estTime, totalDist }: {
  path: { x: number; z: number }[];
  segmentSpeeds: number[];
  blockedSegments: boolean[];
  locale: string;
  onAutoSpeed: () => void;
  estTime: string;
  totalDist: number;
}) {
  const validSpeeds = segmentSpeeds.filter((_, i) => !blockedSegments[i]);
  const maxSpeed = validSpeeds.length > 0 ? Math.max(...validSpeeds) : 0;
  const minSpeed = validSpeeds.length > 0 ? Math.min(...validSpeeds) : 0;
  const blockedCount = blockedSegments.filter(Boolean).length;

  return (
    <div className="bg-gray-700/30 rounded p-2 space-y-1.5 border border-gray-600/50">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-300 font-bold">{t('Path Statistics', locale)}</span>
        <button onClick={onAutoSpeed} className="text-[10px] bg-purple-700/60 hover:bg-purple-600/60 text-purple-200 px-1.5 py-0.5 rounded">{t('Auto Speed (Zone Match)', locale)}</button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        <div className="text-gray-400">{t('Total Length:', locale)}</div>
        <div className="text-cyan-400 font-mono text-right">{totalDist.toFixed(2)}m</div>
        <div className="text-gray-400">{t('Est. Time:', locale)}</div>
        <div className="text-cyan-400 font-mono text-right">{estTime}</div>
        <div className="text-gray-400">{t('Max Speed:', locale)}</div>
        <div className="text-green-400 font-mono text-right">{maxSpeed.toFixed(1)} m/s</div>
        <div className="text-gray-400">{t('Min Speed:', locale)}</div>
        <div className="text-yellow-400 font-mono text-right">{minSpeed.toFixed(1)} m/s</div>
        <div className="text-gray-400">{t('Blocked:', locale)}</div>
        <div className={`font-mono text-right ${blockedCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{blockedCount} / {segmentSpeeds.length}</div>
        <div className="text-gray-400">{t('Segments:', locale)}</div>
        <div className="text-gray-300 font-mono text-right">{segmentSpeeds.length}</div>
      </div>
    </div>
  );
}

function WaypointItem({ wp, index, robotId, robotColor, isNavigating, currentIdx, totalWps, locale }: {
  wp: WaypointConfig;
  index: number;
  robotId: string;
  robotColor: string;
  isNavigating: boolean;
  currentIdx: number;
  totalWps: number;
  locale: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = isNavigating && index === currentIdx;
  const isReached = isNavigating && index < currentIdx;
  const selWpId = useWpSelectStore((s) => s.selectedWpId);
  const isSelected = selWpId === wp.id;

  const speedColor = wp.speed >= 0.8 ? '#4caf50' : wp.speed >= 0.3 ? '#fdd835' : '#ef5350';

  const handleClick = () => {
    if (isSelected) {
      useWpSelectStore.getState().clearSelection();
    } else {
      useWpSelectStore.getState().selectWaypoint(robotId, wp.id);
      setExpanded(true);
    }
  };

  return (
    <div
      role="listitem"
      draggable={!isNavigating}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).classList.add('wp-dragging');
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLElement).classList.remove('wp-dragging');
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        (e.currentTarget as HTMLElement).classList.add('wp-drag-over');
      }}
      onDragLeave={(e) => {
        (e.currentTarget as HTMLElement).classList.remove('wp-drag-over');
      }}
      onDrop={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.remove('wp-drag-over');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIdx = index;
        if (fromIdx === toIdx || isNaN(fromIdx)) return;
        const fleet = useFleetStore.getState();
        const bot = fleet.robots.find((r) => r.id === robotId);
        if (!bot) return;
        const wps = [...bot.waypoints];
        const [moved] = wps.splice(fromIdx, 1);
        wps.splice(toIdx, 0, moved);
        useFleetStore.setState({
          robots: fleet.robots.map((r) =>
            r.id === robotId ? { ...r, waypoints: wps } : r
          ),
        });
      }}
      className={`text-xs rounded select-none ${
        isSelected ? 'bg-cyan-600/30 ring-1 ring-cyan-400'
        : isActive ? 'bg-pink-600/40 ring-1 ring-pink-400'
        : isReached ? 'bg-gray-600/30 opacity-50'
        : 'bg-gray-700/50'
      } ${!isNavigating ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div
        className="flex items-center gap-1 px-2 py-1 cursor-pointer"
        onClick={handleClick}
      >
        <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: isSelected ? '#00e5ff' : robotColor }}>{index + 1}</span>
        <span className="text-gray-300 flex-1 truncate">({wp.x.toFixed(1)}, {wp.z.toFixed(1)})</span>
        <span className="text-[10px] font-mono px-1 rounded" style={{ backgroundColor: speedColor + '44', color: speedColor }}>{wp.speed}m/s</span>
        {wp.waitDuration > 0 && <span className="text-[10px] text-amber-400">⏳{wp.waitDuration}s</span>}
        {wp.targetYaw !== null && <span className="text-[10px] text-cyan-400">🧭{(wp.targetYaw * 180 / Math.PI).toFixed(0)}°</span>}
        {!isNavigating && (
          <button onClick={(e) => { e.stopPropagation(); useFleetStore.getState().removeWaypoint(robotId, wp.id); if (isSelected) useWpSelectStore.getState().clearSelection(); }} className="text-red-400 hover:text-red-300 px-0.5">✕</button>
        )}
      </div>
    </div>
  );
}

function SelectedWaypointEditor({ locale }: { locale: string }) {
  const selRobotId = useWpSelectStore((s) => s.selectedRobotId);
  const selWpId = useWpSelectStore((s) => s.selectedWpId);
  const robots = useFleetStore((s) => s.robots);

  if (!selRobotId || !selWpId) return null;

  const robot = robots.find((r) => r.id === selRobotId);
  const wp = robot?.waypoints.find((w) => w.id === selWpId);
  if (!robot || !wp) return null;

  const wpIdx = robot.waypoints.findIndex((w) => w.id === selWpId);
  const speedColor = wp.speed >= 0.8 ? '#4caf50' : wp.speed >= 0.3 ? '#fdd835' : '#ef5350';

  return (
    <div className="bg-cyan-900/20 border border-cyan-600/40 rounded p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-cyan-300 font-bold">#{wpIdx + 1} {t('Waypoint', locale)}</span>
        <button
          onClick={() => useWpSelectStore.getState().clearSelection()}
          className="text-[10px] text-gray-400 hover:text-white px-1"
        >✕</button>
      </div>
      <div className="text-[10px] text-gray-400">({wp.x.toFixed(2)}, {wp.z.toFixed(2)})</div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-10">{t('Speed:', locale)}</span>
        <input
          type="range" min={0.05} max={2.0} step={0.05}
          value={wp.speed}
          onChange={(e) => useFleetStore.getState().updateWaypoint(selRobotId, selWpId, { speed: parseFloat(e.target.value) })}
          className="flex-1 h-1 accent-green-500"
        />
        <span className="text-[10px] font-mono w-12 text-right" style={{ color: speedColor }}>{wp.speed.toFixed(2)} m/s</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-10">{t('Wait:', locale)}</span>
        <input
          type="number" min={0} max={300} step={1}
          value={wp.waitDuration}
          onChange={(e) => useFleetStore.getState().updateWaypoint(selRobotId, selWpId, { waitDuration: Math.max(0, parseInt(e.target.value) || 0) })}
          className="w-16 text-[10px] bg-gray-600 text-white px-1.5 py-0.5 rounded text-right"
        />
        <span className="text-[10px] text-gray-500">{t('seconds', locale)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-10">{t('Yaw:', locale)}</span>
        {wp.targetYaw !== null ? (
          <>
            <input
              type="number" min={-180} max={180} step={5}
              value={Math.round(wp.targetYaw * 180 / Math.PI)}
              onChange={(e) => useFleetStore.getState().updateWaypoint(selRobotId, selWpId, { targetYaw: (parseInt(e.target.value) || 0) * Math.PI / 180 })}
              className="w-16 text-[10px] bg-gray-600 text-cyan-300 px-1.5 py-0.5 rounded text-right"
            />
            <span className="text-[10px] text-gray-500">°</span>
            <button
              onClick={() => useFleetStore.getState().updateWaypoint(selRobotId, selWpId, { targetYaw: null })}
              className="text-[10px] text-red-400 hover:text-red-300 px-0.5"
            >✕</button>
          </>
        ) : (
          <button
            onClick={() => useFleetStore.getState().updateWaypoint(selRobotId, selWpId, { targetYaw: 0 })}
            className="text-[10px] bg-gray-600 text-gray-400 hover:text-cyan-300 px-1.5 py-0.5 rounded"
          >+ {t('Set Yaw', locale)}</button>
        )}
      </div>
      <button
        onClick={() => { useFleetStore.getState().removeWaypoint(selRobotId, selWpId); useWpSelectStore.getState().clearSelection(); }}
        className="w-full text-[10px] bg-red-700/60 hover:bg-red-600/60 text-red-200 px-1.5 py-1 rounded"
      >
        {t('Delete Waypoint', locale)}
      </button>
    </div>
  );
}
