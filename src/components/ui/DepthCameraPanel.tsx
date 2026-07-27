import { useState } from 'react';
import { useD435iStore } from '../../stores/d435iStore';
import { useHololensStore } from '../../stores/hololensStore';
import { useA11yStore } from '../../stores/a11yStore';
import { t } from '../../i18n';

// 深度相机专属侧栏界面（panel='d435i'）。
// 布局（上→下）：返回 + 标题 + 连接状态；「在大地图显示点云」勾选；RGB 画面。
// RGB：整帧显示不裁剪（w-full + h-auto 按相机原始比例铺满侧栏宽），点击放大到全屏看完整画面。
// 没连相机：可进入但内容禁用 + 显示未连接。
export function DepthCameraPanel() {
  const locale = useA11yStore((s) => s.locale);
  const rgbImage = useD435iStore((s) => s.rgbImage);
  const showPointcloud = useD435iStore((s) => s.showPointcloud);
  const cameraConnected = useD435iStore((s) => s.cameraConnected);
  const cloudCount = useD435iStore((s) => s.cloudCount);
  const [enlarged, setEnlarged] = useState(false);

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
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-gray-400">{t('RGB View', locale)}</div>
            {rgbImage && <div className="text-[9px] text-gray-500">{t('Click to enlarge', locale)}</div>}
          </div>
          {rgbImage ? (
            <div className="border border-gray-600 rounded overflow-hidden bg-black">
              {/* 整帧、不裁剪：按相机原始比例铺满侧栏宽度；点击放大全屏看完整视野 */}
              <img
                src={rgbImage}
                alt="D435i RGB"
                className="w-full h-auto block cursor-pointer"
                onClick={() => setEnlarged(true)}
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

      {/* 全屏放大：显示相机完整画面（最大 94vw×94vh，object-contain 不裁剪）；点空白或 ✕ 关闭 */}
      {enlarged && rgbImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setEnlarged(false)}
        >
          <img
            src={rgbImage}
            alt="D435i RGB"
            className="max-w-[94vw] max-h-[94vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute top-3 right-5 text-white text-2xl leading-none"
            onClick={() => setEnlarged(false)}
          >
            ✕
          </button>
          <div className="absolute top-4 left-5 text-white/70 text-xs">
            {t('RGB View', locale)} · {t('click outside to close', locale)}
          </div>
        </div>
      )}
    </div>
  );
}
