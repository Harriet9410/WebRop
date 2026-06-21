import { useEffect, useRef, useState } from 'react';
import { ROSConnection } from '../ros/ROSConnection';
import { ModeSelector, AppMode } from '../ui/ModeSelector';
import { ActionPanel } from '../ui/ActionPanel';
import { SlamPanel } from '../ui/SlamPanel';
import { SnapshotPanel } from '../ui/SnapshotPanel';
import { useRosStore } from '../../stores/rosStore';
import { useA11yStore } from '../../stores/a11yStore';
import { t, LOCALE_LABELS, Locale } from '../../i18n';
import { onMockLog, getMockLog, mockResetMap, mockClearMap } from '../../ros/mock';

interface SidebarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function Sidebar({ mode, onModeChange }: SidebarProps) {
  const isMock = useRosStore((s) => s.isMock);
  const locale = useA11yStore((s) => s.locale);
  const highContrast = useA11yStore((s) => s.highContrast);
  const lightTheme = useA11yStore((s) => s.lightTheme);

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-hidden relative z-10" role="navigation" aria-label={t('Actions', locale)}>
      <div className="p-3 border-b border-gray-700 shrink-0">
        <h1 className="text-sm font-bold text-white">{t('MRReP / MRHaD', locale)}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{t('Web Editor', locale)}</p>
      </div>

      <div className="p-3 border-b border-gray-700 shrink-0">
        <div className="text-xs text-gray-400 mb-1.5 font-medium">{t('ROS Connection', locale)}</div>
        <ROSConnection />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isMock && <MapSelector locale={locale} />}

        <div className="p-3 border-b border-gray-700">
          <SlamPanel />
        </div>

        <div className="p-3 border-b border-gray-700">
          <div className="text-xs text-gray-400 mb-1.5 font-medium">{t('Mode', locale)}</div>
          <ModeSelector mode={mode} onChange={onModeChange} />
        </div>

        <div className="p-3 border-b border-gray-700">
          <div className="text-xs text-gray-400 mb-1.5 font-medium">{t('Actions', locale)}</div>
          <ActionPanel mode={mode} />
        </div>

        {isMock && <MockLogPanel locale={locale} />}

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
