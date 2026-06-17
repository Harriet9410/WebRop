export type AppMode = 'navigate' | 'hrz' | 'hrp';

interface ModeSelectorProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const modes: { key: AppMode; label: string; icon: string }[] = [
  { key: 'navigate', label: 'Navigate', icon: '🧭' },
  { key: 'hrz', label: 'HRZ Zone', icon: '🚫' },
  { key: 'hrp', label: 'HRP Path', icon: '✏️' },
];

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-1">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`text-xs px-3 py-1.5 rounded font-medium transition ${
            mode === m.key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {m.icon} {m.label}
        </button>
      ))}
    </div>
  );
}
