import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { Scene3D } from './components/scene/Scene3D';
import { ToastOverlay } from './components/ui/ToastOverlay';
import type { AppMode } from './components/ui/ModeSelector';
import { useHRZStore } from './stores/hrzStore';
import { useHRPStore } from './stores/hrpStore';
import { useRosStore } from './stores/rosStore';
import { useUndoStore } from './stores/undoStore';
import { useMapStore } from './stores/mapStore';
import { useTeleopStore } from './stores/teleopStore';
import { useLabelStore } from './stores/labelStore';
import { useA11yStore } from './stores/a11yStore';
import { useTaskStore } from './stores/taskStore';
import { save, load } from './utils/persistence';
import { startTaskEngine, stopTaskEngine } from './ros/taskExecutor';

function App() {
  const [mode, setMode] = useState<AppMode>('navigate');
  const hrzZones = useHRZStore((s) => s.zones);
  const hrpPath = useHRPStore((s) => s.path);
  const mapLabels = useLabelStore((s) => s.labels);
  const taskChains = useTaskStore((s) => s.chains);
  const scheduledTasks = useTaskStore((s) => s.scheduledTasks);
  const conditionalTasks = useTaskStore((s) => s.conditionalTasks);
  const loadZones = useHRZStore((s) => s.loadZones);
  const loadPath = useHRPStore((s) => s.loadPath);
  const loadLabels = useLabelStore((s) => s.loadLabels);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const isMock = useRosStore((s) => s.isMock);
  const highContrast = useA11yStore((s) => s.highContrast);
  const lightTheme = useA11yStore((s) => s.lightTheme);

  useEffect(() => {
    const data = load();
    if (data) {
      if (data.hrzZones) loadZones(data.hrzZones);
      if (data.hrpPath) loadPath(data.hrpPath);
      if (data.labels) loadLabels(data.labels);
      if (data.taskChains || data.scheduledTasks || data.conditionalTasks) {
        loadTasks({
          chains: data.taskChains || [],
          scheduledTasks: data.scheduledTasks || [],
          conditionalTasks: data.conditionalTasks || [],
        });
      }
    }
    startTaskEngine();
    return () => stopTaskEngine();
  }, []);

  useEffect(() => {
    save(hrzZones, hrpPath, mapLabels, taskChains, scheduledTasks, conditionalTasks);
  }, [hrzZones, hrpPath, mapLabels, taskChains, scheduledTasks, conditionalTasks]);

  useEffect(() => {
    if (!isMock && mode === 'mapedit') {
      setMode('navigate');
    }
  }, [isMock, mode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (mode === 'mapedit') {
          useMapStore.getState().mapUndo();
        } else {
          useUndoStore.getState().undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (mode === 'mapedit') {
          useMapStore.getState().mapRedo();
        } else {
          useUndoStore.getState().redo();
        }
      }
      if (e.key === 'Escape') {
        // reserved
      }
      useTeleopStore.getState().keyDown(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      useTeleopStore.getState().keyUp(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mode]);

  const teleopTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    teleopTickRef.current = setInterval(() => {
      useTeleopStore.getState().tick();
    }, 50);
    return () => {
      if (teleopTickRef.current) clearInterval(teleopTickRef.current);
    };
  }, []);

  const [followRobot, setFollowRobot] = useState(false);
  const teleopEnabled = useTeleopStore((s) => s.teleopEnabled);
  const toggleTeleop = () => useTeleopStore.getState().setTeleopEnabled(!teleopEnabled);

  return (
    <div className={`flex h-screen w-screen bg-gray-900 text-white ${highContrast ? 'hc-mode' : ''} ${lightTheme ? 'light-theme' : ''}`}>
      <Sidebar mode={mode} onModeChange={setMode} />
      <div className="flex-1 flex flex-col">
        <div className="flex-1">
          <Scene3D mode={mode} followRobot={followRobot} />
        </div>
        <StatusBar mode={mode} followRobot={followRobot} onToggleFollow={() => setFollowRobot((f) => !f)} onToggleTeleop={toggleTeleop} />
      </div>
      <ToastOverlay />
    </div>
  );
}

export default App;
