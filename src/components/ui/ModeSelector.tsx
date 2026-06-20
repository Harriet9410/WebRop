import { useRosStore } from '../../stores/rosStore';
import { useA11yStore } from '../../stores/a11yStore';
import { t } from '../../i18n';

export type AppMode = 'navigate' | 'hrz' | 'hrp' | 'mapedit' | 'tasks' | 'relocate';

interface ModeSelectorProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const isMock = useRosStore((s) => s.isMock);
  const locale = useA11yStore((s) => s.locale);

  const allModes: { key: AppMode; label: string; icon: string; mockOnly: boolean }[] = [
    { key: 'navigate', label: t('Navigate', locale), icon: '🧭', mockOnly: false },
    { key: 'relocate', label: t('Relocate', locale), icon: '📍', mockOnly: false },
    { key: 'mapedit', label: t('Map Edit', locale), icon: '🗺️', mockOnly: true },
    { key: 'hrz', label: t('HRZ Zone', locale), icon: '🚫', mockOnly: false },
    { key: 'hrp', label: t('HRP Path', locale), icon: '✏️', mockOnly: false },
    { key: 'tasks', label: t('Tasks', locale), icon: '📋', mockOnly: false },
  ];

  const visibleModes = allModes.filter((m) => !m.mockOnly || isMock);
  const safeMode = visibleModes.find((m) => m.key === mode) ? mode : 'navigate';

  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label={t('Mode', locale)}>
      {visibleModes.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`text-xs px-3 py-1.5 rounded font-medium transition ${
            safeMode === m.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          role="tab"
          aria-selected={safeMode === m.key}
          aria-label={m.label}
        >
          {m.icon} {m.label}
        </button>
      ))}
    </div>
  );
}
