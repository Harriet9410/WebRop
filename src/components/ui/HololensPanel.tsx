import { useEffect, useState } from 'react';
import { useHololensStore } from '../../stores/hololensStore';

export function HololensPanel() {
  const pose = useHololensStore((s) => s.pose);
  const offset = useHololensStore((s) => s.offset);
  const calibrating = useHololensStore((s) => s.calibrating);
  const setCalibrating = useHololensStore((s) => s.setCalibrating);
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

      {/* 校准按钮 */}
      <button
        type="button"
        disabled={!connected || calibrating}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (calibrating) {
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
        {calibrating ? '🔧 点击地图校准中...（再按取消）' : connected ? '校准 HL2 位置' : 'HL2 未连接'}
      </button>

      {calibrating && (
        <div className="text-[10px] text-yellow-400 bg-yellow-900/30 rounded p-2">
          点击 3D 地图上你实际站的位置，HL2 标记会跳过去。
        </div>
      )}
    </div>
  );
}
