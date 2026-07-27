import { useD435iStore } from '../../stores/d435iStore';
import { useHololensStore } from '../../stores/hololensStore';
import { useA11yStore } from '../../stores/a11yStore';
import { t } from '../../i18n';

// 深度相机专属侧栏界面（panel='d435i' 时显示）。
// 布局（上→下）：返回按钮 + 标题 + 连接状态徽标；「在大地图显示点云」勾选框；RGB 画面。
// 没连相机（cameraConnected=false）：可进入此界面，但内容区整体禁用 + 显示未连接提示。
// 深度图按需暂不做（决策：RGB + 点云够，省一个 EP 节点）。
export function DepthCameraPanel() {
  const locale = useA11yStore((s) => s.locale);
  const rgbImage = useD435iStore((s) => s.rgbImage);
  const showPointcloud = useD435iStore((s) => s.showPointcloud);
  const cameraConnected = useD435iStore((s) => s.cameraConnected);
  const cloudCount = useD435iStore((s) => s.cloudCount);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => useHololensStore.getState().setPanel('robot')}
          className="text-[10px] text-gray-400 hover:text-white"
        >
          ◀ {t('Back', locale)}
        </button>
        <span className="text-[10px] font-bold text-cyan-300">{t('Depth Camera', locale)}</span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded ${
            cameraConnected ? 'bg-green-600/40 text-green-300' : 'bg-gray-600/40 text-gray-400'
          }`}
        >
          {cameraConnected ? t('Connected', locale) : t('Not Connected', locale)}
        </span>
      </div>

      <div className={cameraConnected ? 'space-y-2' : 'space-y-2 opacity-50 pointer-events-none'}>
        {/* 点云开关：仿 SlamPanel 的 Laser Scan 勾选框，控制大地图 PointCloudVisual */}
        <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showPointcloud}
            onChange={() => useD435iStore.getState().setShowPointcloud(!showPointcloud)}
            className="w-3 h-3 accent-cyan-500"
          />
          {t('Show Point Cloud on Map', locale)}
          {cloudCount > 0 && <span className="text-cyan-400">({cloudCount})</span>}
        </label>

        <div className="space-y-1">
          <div className="text-[10px] text-gray-400">{t('RGB View', locale)}</div>
          {rgbImage ? (
            <div className="border border-gray-600 rounded overflow-hidden bg-black">
              <img
                src={rgbImage}
                alt="D435i RGB"
                className="w-full h-auto"
                style={{ maxHeight: '180px', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div
              className="border border-gray-700 rounded bg-gray-900 flex items-center justify-center text-[9px] text-gray-600"
              style={{ height: '120px' }}
            >
              {t('No image', locale)}
            </div>
          )}
        </div>
      </div>

      {!cameraConnected && (
        <div className="text-[9px] text-amber-400">
          {t('No depth camera detected. Check D435i connection and topics.', locale)}
        </div>
      )}
    </div>
  );
}
