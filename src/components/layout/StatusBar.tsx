import { useState, useEffect } from 'react';
import { useRosStore } from '../../stores/rosStore';
import { useHRZStore } from '../../stores/hrzStore';
import { useHRPStore } from '../../stores/hrpStore';
import { useUndoStore } from '../../stores/undoStore';
import { useTeleopStore } from '../../stores/teleopStore';
import { useInflationStore } from '../../stores/inflationStore';
import { useA11yStore } from '../../stores/a11yStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useMapStore } from '../../stores/mapStore';
import { useAmclStore } from '../../stores/amclStore';
import { t, Locale } from '../../i18n';
import { setCameraPreset, CameraPreset } from '../scene/CameraControls';
import type { AppMode } from '../ui/ModeSelector';

function getShortcuts(locale: Locale) {
  return [
    { keys: 'W/A/S/D', desc: t('Teleop (forward/left/back/right)', locale) },
    { keys: 'Ctrl+Z', desc: t('Undo', locale) },
    { keys: 'Ctrl+Y', desc: t('Redo', locale) },
    { keys: 'Shift+Click', desc: t('Snap to 0.5m grid (HRZ/HRP)', locale) },
    { keys: t('Left Click', locale), desc: t('Add waypoint / draw / place', locale) },
    { keys: t('Right Click', locale), desc: t('Rotate view (drag) / Insert path point (HRP)', locale) },
    { keys: t('Middle Click', locale), desc: t('Pan view (drag)', locale) },
    { keys: t('Scroll', locale), desc: t('Zoom', locale) },
    { keys: 'Dbl Click', desc: t('Add map label', locale) },
  ];
}

interface StatusBarProps {
  mode: AppMode;
  followRobot: boolean;
  onToggleFollow: () => void;
  onToggleTeleop: () => void;
}

export function StatusBar({ mode: _mode, followRobot, onToggleFollow, onToggleTeleop }: StatusBarProps) {
  const rosStatus = useRosStore((s) => s.status);
  const isMock = useRosStore((s) => s.isMock);
  const zoneCount = useHRZStore((s) => s.zones.length);
  const pathPts = useHRPStore((s) => s.path.length);
  const undoCanUndo = useUndoStore((s) => s.canUndo);
  const undoCanRedo = useUndoStore((s) => s.canRedo);
  const mapCanUndo = useMapStore((s) => s.canMapUndo);
  const mapCanRedo = useMapStore((s) => s.canMapRedo);
  const canUndo = undoCanUndo || mapCanUndo;
  const canRedo = undoCanRedo || mapCanRedo;

  const handleUndo = () => {
    if (mapCanUndo) useMapStore.getState().mapUndo();
    if (undoCanUndo) useUndoStore.getState().undo();
  };
  const handleRedo = () => {
    if (mapCanRedo) useMapStore.getState().mapRedo();
    if (undoCanRedo) useUndoStore.getState().redo();
  };
  const teleopEnabled = useTeleopStore((s) => s.teleopEnabled);
  const showInflation = useInflationStore((s) => s.showInflation);
  const locale = useA11yStore((s) => s.locale);
  const fleetRobots = useFleetStore((s) => s.robots);
  const activeRobotId = useFleetStore((s) => s.activeRobotId);
  const lightTheme = useA11yStore((s) => s.lightTheme);
  const activeBot = fleetRobots.find((r) => r.id === activeRobotId);
  const linearV = activeBot?.linearVelocity ?? 0;
  const angularV = activeBot?.angularVelocity ?? 0;
  const [shiftHeld, setShiftHeld] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const handlePreset = (p: CameraPreset) => {
    setCameraPreset(p);
    setActivePreset(p);
    setTimeout(() => setActivePreset(null), 1000);
  };

  return (
    <div className="h-7 bg-gray-900 border-t border-gray-700 flex items-center px-3 text-xs text-gray-400 gap-3" role="status" aria-label="Status bar">
      <span>
        {t('ROS:', locale)}{' '}
        <span
          className={
            rosStatus === 'connected'
              ? isMock ? 'text-purple-400' : 'text-green-400'
              : rosStatus === 'error'
              ? 'text-red-400'
              : 'text-yellow-400'
          }
          aria-label={`ROS status: ${rosStatus}${isMock ? ' mock' : ''}`}
        >
          {rosStatus}{isMock ? ` ${t('(mock)', locale)}` : ''}
        </span>
      </span>
      <span>{t('Zones:', locale)} {zoneCount}</span>
      <span>{t('Path:', locale)} {pathPts}</span>
      {activeBot && (
        <span className="flex items-center gap-1">
          <span className="text-gray-500">🔋</span>
          <span className={`font-mono ${activeBot.battery > 20 ? 'text-green-400' : activeBot.battery > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
            {activeBot.battery.toFixed(0)}%
          </span>
        </span>
      )}
      <MapOverlaySlider />
      <AmclIndicator />
      <span>
        <span className="text-gray-500">{t('V:', locale)}</span>{' '}
        <span className="text-cyan-400 font-mono">{Math.abs(linearV).toFixed(2)}m/s</span>
        <span className="text-gray-600 mx-1">|</span>
        <span className="text-gray-500">{t('W:', locale)}</span>{' '}
        <span className="text-cyan-400 font-mono">{(angularV * 180 / Math.PI).toFixed(0)}°/s</span>
      </span>
      <span className="flex items-center gap-1" role="group" aria-label={t('View:', locale)}>
        <span className="text-gray-500 mr-0.5">{t('View:', locale)}</span>
        <button
          onClick={() => handlePreset('top')}
          className={`px-1 py-0 rounded text-[10px] ${activePreset === 'top' ? 'text-green-400 bg-green-900/40' : 'text-gray-500 hover:text-gray-300'}`}
          aria-label={t('Top', locale)}
        >
          {t('Top', locale)}
        </button>
        <button
          onClick={() => handlePreset('side')}
          className={`px-1 py-0 rounded text-[10px] ${activePreset === 'side' ? 'text-green-400 bg-green-900/40' : 'text-gray-500 hover:text-gray-300'}`}
          aria-label={t('Side', locale)}
        >
          {t('Side', locale)}
        </button>
        <button
          onClick={() => handlePreset('perspective')}
          className={`px-1 py-0 rounded text-[10px] ${activePreset === 'perspective' ? 'text-green-400 bg-green-900/40' : 'text-gray-500 hover:text-gray-300'}`}
          aria-label="45°"
        >
          45°
        </button>
      </span>
      <button
        onClick={() => useInflationStore.getState().toggleInflation()}
        className={`px-1.5 py-0 rounded text-[10px] ${showInflation ? 'text-orange-400 bg-orange-900/40 font-medium' : 'text-gray-500 hover:text-gray-300'}`}
        aria-label={t('Inflate', locale)}
        aria-pressed={showInflation}
      >
        {t('Inflate', locale)}
      </button>
      <span className="ml-auto flex items-center gap-3">
        <button
          onClick={onToggleTeleop}
          className={`px-1.5 py-0 rounded ${teleopEnabled ? 'text-yellow-400 bg-yellow-900/40 font-medium' : 'text-gray-600 hover:text-gray-400'}`}
          aria-label={`${t('WASD', locale)} teleop`}
          aria-pressed={teleopEnabled}
        >
          {t('WASD', locale)}
        </button>
        {shiftHeld && <span className="text-cyan-400 font-medium">{t('SNAP 0.5m', locale)}</span>}
        <button
          onClick={onToggleFollow}
          className={`px-1.5 py-0 rounded ${followRobot ? 'text-green-400 bg-green-900/40' : 'text-gray-600 hover:text-gray-400'}`}
          aria-label={t('Follow', locale)}
          aria-pressed={followRobot}
        >
          {t('Follow', locale)}
        </button>
        <button
          onClick={() => useA11yStore.getState().toggleLightTheme()}
          className={`px-1.5 py-0 rounded ${lightTheme ? 'text-amber-400 bg-amber-900/40 font-medium' : 'text-gray-600 hover:text-gray-400'}`}
          aria-label={t('Light Theme', locale)}
          aria-pressed={lightTheme}
        >
          ☀
        </button>
        <button onClick={handleUndo} disabled={!canUndo} className={`px-1 py-0 rounded text-sm ${canUndo ? 'text-blue-400 hover:text-blue-300' : 'text-gray-600 cursor-default'}`} aria-label={t('Undo', locale)}>↶</button>
        <button onClick={handleRedo} disabled={!canRedo} className={`px-1 py-0 rounded text-sm ${canRedo ? 'text-blue-400 hover:text-blue-300' : 'text-gray-600 cursor-default'}`} aria-label={t('Redo', locale)}>↷</button>
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className={`px-1.5 py-0 rounded ${showShortcuts ? 'text-blue-400 bg-blue-900/40' : 'text-gray-600 hover:text-gray-400'}`}
          aria-label={t('Keyboard Shortcuts', locale)}
          aria-expanded={showShortcuts}
        >
          ?
        </button>
      </span>
      {showShortcuts && (
        <div className="absolute bottom-7 right-3 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 z-50 min-w-[260px]" role="dialog" aria-label={t('Keyboard Shortcuts', locale)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-200 font-bold">{t('Keyboard Shortcuts', locale)}</span>
            <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-white text-xs" aria-label="Close">✕</button>
          </div>
          <div className="space-y-1">
            {getShortcuts(locale).map((s) => (
              <div key={s.keys} className="flex items-center gap-2 text-xs">
                <kbd className="bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded text-[10px] font-mono min-w-[80px] text-center shrink-0 border border-gray-600">{s.keys}</kbd>
                <span className="text-gray-400">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MapOverlaySlider() {
  const previousGrid = useMapStore((s) => s.previousGrid);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const locale = useA11yStore((s) => s.locale);

  if (!previousGrid) return null;

  return (
    <span className="flex items-center gap-1">
      <span className="text-[10px] text-gray-500">{t('Old Map:', locale)}</span>
      <input
        type="range" min={0} max={1} step={0.05}
        value={overlayOpacity}
        onChange={(e) => useMapStore.getState().setOverlayOpacity(parseFloat(e.target.value))}
        className="w-12 h-1 accent-purple-500"
        aria-label={t('Old map overlay opacity', locale)}
      />
      <span className="text-[10px] text-purple-400 font-mono w-6">{(overlayOpacity * 100).toFixed(0)}%</span>
    </span>
  );
}

function AmclIndicator() {
  const quality = useAmclStore((s) => s.quality);
  const particleCount = useAmclStore((s) => s.particleCount);
  const locale = useA11yStore((s) => s.locale);

  const qColor = quality === 'good' ? 'text-green-400' : quality === 'fair' ? 'text-yellow-400' : 'text-red-400';
  const qLabel = quality === 'good' ? t('Good', locale) : quality === 'fair' ? t('Fair', locale) : t('Poor', locale);

  return (
    <span className="flex items-center gap-1">
      <span className="text-[10px] text-gray-500">📡</span>
      <span className={`text-[10px] font-mono ${qColor}`}>{qLabel}</span>
      {particleCount > 0 && <span className="text-[10px] text-gray-600">({particleCount})</span>}
      {quality === 'poor' && (
        <span className="text-[10px] text-red-400 animate-pulse">⚠ {t('Low localization!', locale)}</span>
      )}
    </span>
  );
}
