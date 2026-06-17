import { ROSConnection } from '../ros/ROSConnection';
import { ModeSelector, AppMode } from '../ui/ModeSelector';
import { ActionPanel } from '../ui/ActionPanel';
import { useHRZStore } from '../../stores/hrzStore';
import { useHRPStore } from '../../stores/hrpStore';
import { useRosStore } from '../../stores/rosStore';

interface SidebarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function Sidebar({ mode, onModeChange }: SidebarProps) {
  const rosStatus = useRosStore((s) => s.status);

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-gray-700">
        <h1 className="text-sm font-bold text-white">MRReP / MRHaD</h1>
        <p className="text-xs text-gray-400 mt-0.5">Web Editor</p>
      </div>

      <div className="p-3 border-b border-gray-700">
        <div className="text-xs text-gray-400 mb-1.5 font-medium">ROS Connection</div>
        <ROSConnection />
      </div>

      <div className="p-3 border-b border-gray-700">
        <div className="text-xs text-gray-400 mb-1.5 font-medium">Mode</div>
        <ModeSelector mode={mode} onChange={onModeChange} />
      </div>

      <div className="p-3 flex-1">
        <div className="text-xs text-gray-400 mb-1.5 font-medium">Actions</div>
        <ActionPanel mode={mode} />
      </div>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
        <div>Right-click: Rotate</div>
        <div>Middle-click: Pan</div>
        <div>Scroll: Zoom</div>
      </div>
    </div>
  );
}
