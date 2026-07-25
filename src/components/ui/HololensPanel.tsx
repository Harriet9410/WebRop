import { useEffect, useState } from 'react';
import { useHololensStore } from '../../stores/hololensStore';

export function HololensPanel() {
  const pose = useHololensStore((s) => s.pose);
  const offset = useHololensStore((s) => s.offset);
  const calibrating = useHololensStore((s) => s.calibrating);
  const setCalibrating = useHololensStore((s) => s.setCalibrating);
  const calibPoint1 = useHololensStore((s) => s.calibPoint1);
  const [connected, setConnected] = useState(false);

  // 每 500ms 刷新连接状态（3 秒没数据 = 断开）
  useEffect(() => {
    const check = () => setConnected(useHololensStore.getState().isHL2Connected());
    check();
    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }, []);

  const aligned = !!offset;

  return (
    <div className="space-y-2">
      {/* 连接状态 */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
        <span className={`text-xs ${connected ? 'text-green-400' : 'text-gray-500'}`}>
          {connected ? 'HL2 已连接' : 'HL2 未连接'}
        </span>
      </div>

      {/* 位姿信息 */}
      {pose && connected && (
        <div className="text-[10px] text-gray-500 font-mono space-y-0.5 bg-gray-900/50 rounded p-2">
          <div>位置: ({pose.x.toFixed(2)}, {pose.z.toFixed(2)})</div>
          <div>朝向: {(pose.yaw * 180 / Math.PI).toFixed(0)}°</div>
          <div className={aligned ? 'text-green-400' : 'text-yellow-400'}>
            {aligned ? '✅ 已对齐' : '⚠️ 未对齐'}
          </div>
        </div>
      )}

      {/* 校准按钮：未校准时进入；校准中变"取消"（清掉两点状态） */}
      <button
        type="button"
        disabled={!connected}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (calibrating) {
            // 取消：清两点状态
            useHololensStore.getState().setCalibPoint1(null);
            useHololensStore.getState().setPendingPose(null);
            setCalibrating(false);
          } else {
            setCalibrating(true);
          }
        }}
        className={`w-full text-xs px-3 py-2 rounded font-medium transition-colors ${
          calibrating
            ? 'bg-yellow-600 text-white animate-pulse'
            : connected
            ? 'bg-red-600 hover:bg-red-500 text-white'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {calibrating ? '✕ 取消校准' : connected ? '校准 HL2（两点）' : 'HL2 未连接'}
      </button>

      {calibrating && (
        <div className="text-[10px] text-yellow-400 bg-yellow-900/30 rounded p-2">
          {calibPoint1 ? (
            <>第二步：走到<b>另一个位置</b>（隔 1~2 米以上），<b>点一下地面</b>即完成校准。</>
          ) : (
            <>第一步：<b>按住你站的位置 + 拖出面朝方向</b>，松手。（拖方向=定朝向）</>
          )}
        </div>
      )}
    </div>
  );
}
