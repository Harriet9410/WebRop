import type { MouseEvent } from 'react';
import { useMissionStore, parseMissionStatus } from '../../stores/missionStore';
import { publishHrpControl } from '../../ros/connection';
import { useRosStore } from '../../stores/rosStore';

// 任务控制条：显示 hrp_follower 状态 + 暂停/继续 + 取消。
// 暂停/继续只对 hrp_follower 任务有效（要它记航点，故按状态启停）。
// 取消是“通用”的：常开 + 直接发 move_base/cancel，停任何来源（WebRop/HL2/RViz）的 move_base goal。
export function MissionControl() {
  const status = useMissionStore((s) => s.status);
  const lastUpdate = useMissionStore((s) => s.lastUpdate);
  const isMock = useRosStore((s) => s.isMock);
  const { phase, idx, total } = parseMissionStatus(status);

  let statusText = '空闲';
  let statusColor = 'text-gray-500';
  if (phase === 'running') {
    statusText = `执行中 ${idx}/${total}`;
    statusColor = 'text-green-400';
  } else if (phase === 'paused') {
    statusText = `已暂停 ${idx}/${total}`;
    statusColor = 'text-yellow-400';
  }

  // 暂停/继续只对 hrp_follower 任务有效；取消是通用的（常开，停任何来源的 move_base goal）
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <>
      <div className="text-xs text-gray-400 mb-1.5 font-medium">任务控制</div>
      <div className={`text-[11px] font-mono mb-2 ${lastUpdate > 0 ? statusColor : 'text-gray-500'}`}>
        {lastUpdate > 0 ? statusText : '空闲'}
      </div>
      <div className="flex gap-1.5">
        {phase === 'paused' ? (
          <button
            type="button"
            onMouseDown={stop}
            onClick={() => publishHrpControl('resume')}
            disabled={isMock || phase !== 'paused'}
            className="flex-1 text-xs px-2 py-1.5 rounded font-medium bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white"
          >
            ▶ 继续
          </button>
        ) : (
          <button
            type="button"
            onMouseDown={stop}
            onClick={() => publishHrpControl('pause')}
            disabled={isMock || phase !== 'running'}
            className="flex-1 text-xs px-2 py-1.5 rounded font-medium bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white"
          >
            ⏸ 暂停
          </button>
        )}
        <button
          type="button"
          onMouseDown={stop}
          onClick={() => publishHrpControl('cancel')}
          disabled={isMock}
          title="取消所有 move_base 任务（WebRop/HL2 来源都能停）"
          className="flex-1 text-xs px-2 py-1.5 rounded font-medium bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white"
        >
          ✕ 取消
        </button>
      </div>
    </>
  );
}
