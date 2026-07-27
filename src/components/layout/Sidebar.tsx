import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ROSConnection } from '../ros/ROSConnection';
import { ModeSelector, AppMode } from '../ui/ModeSelector';
import { ActionPanel } from '../ui/ActionPanel';
import { SlamPanel } from '../ui/SlamPanel';
import { SnapshotPanel } from '../ui/SnapshotPanel';
import { HololensPanel } from '../ui/HololensPanel';
import { MissionControl } from '../ui/MissionControl';
import { DepthCameraPanel } from '../ui/DepthCameraPanel';
import { useRosStore } from '../../stores/rosStore';
import { useA11yStore } from '../../stores/a11yStore';
import { useHololensStore } from '../../stores/hololensStore';
import { t, LOCALE_LABELS, Locale } from '../../i18n';
import { onMockLog, getMockLog, mockResetMap, mockClearMap } from '../../ros/mock';

interface SidebarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const MIN_SIDEBAR = 256; // 当前宽度 w-64，作为最小宽度
const MAX_RATIO = 0.5;   // 最大 = 视口的 50%
const SIDEBAR_KEY = 'webrop.sidebarWidth.v2';

export function Sidebar({ mode, onModeChange }: SidebarProps) {
  const isMock = useRosStore((s) => s.isMock);
  const locale = useA11yStore((s) => s.locale);
  const highContrast = useA11yStore((s) => s.highContrast);
  const lightTheme = useA11yStore((s) => s.lightTheme);
  const panel = useHololensStore((s) => s.panel);
  const hl2Connected = useHololensStore((s) => s.isHL2Connected());
  const hl2Tick = useHololensStore((s) => s.lastUpdate);

  // 可调宽度：最小 256px(当前大小)，最大 50% 视口；首次默认取中点，持久化到 localStorage
  const [width, setWidth] = useState<number>(() => {
    const maxW = window.innerWidth * MAX_RATIO;
    const saved = Number(localStorage.getItem(SIDEBAR_KEY));
    const initial = saved > 0 ? saved : (MIN_SIDEBAR + maxW) / 2; // 最大与最小的中点
    return Math.max(MIN_SIDEBAR, Math.min(maxW, initial));
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(width));
  }, [width]);

  // 视口变窄时保证不超过 50%
  useEffect(() => {
    const onResize = () => setWidth((w) => Math.max(MIN_SIDEBAR, Math.min(window.innerWidth * MAX_RATIO, w)));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startResize = (e: ReactPointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: PointerEvent) => {
      const maxW = window.innerWidth * MAX_RATIO;
      setWidth(Math.max(MIN_SIDEBAR, Math.min(maxW, startWidth + (ev.clientX - startX))));
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-hidden relative z-10 shrink-0" style={{ width }} role="navigation" aria-label={t('Actions', locale)}>
      <div className="p-3 border-b border-gray-700 shrink-0">
        <h1 className="text-sm font-bold text-white">{t('MRReP / MRHaD', locale)}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{t('Web Editor', locale)}</p>
      </div>

      <div className="p-3 border-b border-gray-700 shrink-0">
        <div className="text-xs text-gray-400 mb-1.5 font-medium">{t('ROS Connection', locale)}</div>
        <ROSConnection />
      </div>

      {/* Robot / HL2 切换器 */}
      <div className="p-2 border-b border-gray-700 shrink-0">
        <div className="flex gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => useHololensStore.getState().setPanel('robot')}
            className={`flex-1 text-xs px-2 py-1.5 rounded font-medium transition-colors ${
              panel === 'robot'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            🤖 Robot
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!hl2Connected}
            onClick={() => useHololensStore.getState().setPanel('hl2')}
            className={`flex-1 text-xs px-2 py-1.5 rounded font-medium transition-colors ${
              panel === 'hl2'
                ? 'bg-red-600 text-white'
                : hl2Connected
                ? 'bg-gray-700 text-gray-400 hover:text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
            title={hl2Connected ? '' : 'HL2 未连接'}
          >
            🥽 HL2
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isMock && <MapSelector locale={locale} />}

        {/* HL2 面板 */}
        {panel === 'hl2' && (
          <div className="p-3 border-b border-gray-700">
            <div className="text-xs text-gray-400 mb-1.5 font-medium">HoloLens 2</div>
            <HololensPanel />
          </div>
        )}

        {/* 深度相机面板（panel='d435i'） */}
        {panel === 'd435i' && (
          <div className="p-3 border-b border-gray-700">
            <DepthCameraPanel />
          </div>
        )}

        {/* Robot 面板（当前功能，选 Robot 时显示） */}
        {panel === 'robot' && (<>
        {/* 深度相机入口：位于 Robot/HL2 切换器下方、SLAM建图上方；点击进入专属界面 panel='d435i'（mock 下隐藏） */}
        {!isMock && (
          <div className="p-3 border-b border-gray-700">
            <button
              type="button"
              onClick={() => useHololensStore.getState().setPanel('d435i')}
              className="w-full text-[10px] px-2 py-1.5 rounded bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white flex items-center justify-between"
            >
              <span>📷 {t('Depth Camera', locale)}</span>
              <span className="text-gray-500">▶</span>
            </button>
          </div>
        )}

        <div className="p-3 border-b border-gray-700">
          <SlamPanel />
        </div>

        <div className="p-3 border-b border-gray-700">
          <MissionControl />
        </div>

        <div className="p-3 border-b border-gray-700">
          <div className="text-xs text-gray-400 mb-1.5 font-medium">{t('Mode', locale)}</div>
          <ModeSelector mode={mode} onChange={onModeChange} />
        </div>

        <div className="p-3 border-b border-gray-700">
          <div className="text-xs text-gray-400 mb-1.5 font-medium">{t('Actions', locale)}</div>
          <ActionPanel mode={mode} />
        </div>
        </>)}

        {isMock && <MockLogPanel locale={locale} />}
        {!isMock && <RosLogPanel locale={locale} />}

        <SnapshotPanel />
      </div>

      <div className="p-2 border-t border-gray-700 shrink-0">
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[10px] text-gray-500">Lang:</span>
          {(['en', 'zh', 'ja'] as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              onMouseDown={(e) => { e.stopPropagation(); useA11yStore.getState().setLocale(l); }}
              className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none ${
                locale === l ? 'bg-blue-600 text-white font-bold' : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
              aria-label={`Switch to ${LOCALE_LABELS[l]}`}
              aria-pressed={locale === l}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.stopPropagation(); useA11yStore.getState().toggleHighContrast(); }}
            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none ${
              highContrast ? 'bg-yellow-600 text-white font-bold' : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
            aria-label="Toggle high contrast mode"
            aria-pressed={highContrast}
          >
            HC
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.stopPropagation(); useA11yStore.getState().toggleLightTheme(); }}
            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none ${
              lightTheme ? 'bg-amber-500 text-white font-bold' : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
            aria-label="Toggle light theme"
            aria-pressed={lightTheme}
          >
            ☀
          </button>
        </div>
        <div className="text-[10px] text-gray-500">{t('Right-click: Rotate', locale)}</div>
        <div className="text-[10px] text-gray-500">{t('Middle-click: Pan', locale)}</div>
        <div className="text-[10px] text-gray-500">{t('Scroll: Zoom', locale)}</div>
      </div>

      {/* 可调宽度手柄：拖动调整侧边栏宽度，最小 256px，最大 50% 视口 */}
      <div
        onPointerDown={startResize}
        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors z-20"
        aria-hidden="true"
        title="拖动调整宽度"
      />
    </div>
  );
}

function MapSelector({ locale }: { locale: Locale }) {
  return (
    <div className="p-3 border-b border-gray-700">
      <div className="text-xs text-gray-400 mb-1.5 font-medium">{t('Map', locale)}</div>
      <div className="space-y-1.5">
        <button
          onClick={mockResetMap}
          className="w-full text-xs bg-yellow-700 hover:bg-yellow-800 text-white px-2 py-1.5 rounded"
          aria-label={t('Reset Default Map', locale)}
        >
          {t('Default Map', locale)}
        </button>
        <button
          onClick={mockClearMap}
          className="w-full text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1.5 rounded"
          aria-label={t('Clear All Walls', locale)}
        >
          {t('Blank Map', locale)}
        </button>
      </div>
    </div>
  );
}

function MockLogPanel({ locale }: { locale: Locale }) {
  const logRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>(() => getMockLog());

  useEffect(() => {
    setLines(getMockLog());
    const unsub = onMockLog((newLog) => {
      setLines(newLog);
      requestAnimationFrame(() => {
        if (logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
      });
    });
    return unsub;
  }, []);

  return (
    <div className="p-3 border-b border-gray-700 flex-1 min-h-0 flex flex-col">
      <div className="text-xs text-purple-400 mb-1.5 font-medium">{t('Mock Log', locale)}</div>
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 text-xs text-gray-400 font-mono leading-relaxed min-h-0 max-h-48"
        role="log"
        aria-label={t('Mock Log', locale)}
      >
        {lines.length === 0 ? (
          <span className="text-gray-600">{t('Waiting for events...', locale)}</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
          ))
        )}
      </div>
    </div>
  );
}

function RosLogPanel({ locale }: { locale: Locale }) {
  const logRef = useRef<HTMLDivElement>(null);
  const rosLog = useRosStore((s) => s.rosLog);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    });
  }, [rosLog]);

  return (
    <div className="p-3 border-b border-gray-700 flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs text-cyan-400 font-medium">{t('ROS Log', locale)}</div>
        <button
          onClick={() => useRosStore.getState().clearRosLog()}
          className="text-[9px] text-gray-500 hover:text-gray-300"
        >
          {t('Clear History', locale)}
        </button>
      </div>
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 text-[10px] text-gray-400 font-mono leading-relaxed min-h-0 max-h-48"
        role="log"
        aria-label={t('ROS Log', locale)}
      >
        {rosLog.length === 0 ? (
          <span className="text-gray-600">{t('Waiting for events...', locale)}</span>
        ) : (
          rosLog.map((entry, i) => {
            const dirColor = entry.direction === 'in' ? 'text-green-400' : entry.direction === 'out' ? 'text-blue-400' : 'text-yellow-400';
            const dirSymbol = entry.direction === 'in' ? '◀' : entry.direction === 'out' ? '▶' : '●';
            return (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span className="text-gray-600">{new Date(entry.timestamp).toLocaleTimeString()}</span>{' '}
                <span className={dirColor}>{dirSymbol}</span>{' '}
                <span className="text-gray-300">{entry.topic}</span>{' '}
                <span className="text-gray-500">{entry.summary}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
