import { useRosStore } from '../../stores/rosStore';
import { useHRZStore } from '../../stores/hrzStore';
import { useHRPStore } from '../../stores/hrpStore';

export function StatusBar() {
  const rosStatus = useRosStore((s) => s.status);
  const isMock = useRosStore((s) => s.isMock);
  const zoneCount = useHRZStore((s) => s.zones.length);
  const pathPts = useHRPStore((s) => s.path.length);

  return (
    <div className="h-7 bg-gray-900 border-t border-gray-700 flex items-center px-3 text-xs text-gray-400 gap-4">
      <span>
        ROS:{' '}
        <span
          className={
            rosStatus === 'connected'
              ? isMock ? 'text-purple-400' : 'text-green-400'
              : rosStatus === 'error'
              ? 'text-red-400'
              : 'text-yellow-400'
          }
        >
          {rosStatus}{isMock ? ' (mock)' : ''}
        </span>
      </span>
      <span>Zones: {zoneCount}</span>
      <span>Path pts: {pathPts}</span>
    </div>
  );
}
