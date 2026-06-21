import { useState } from 'react';
import { useTaskStore, TaskStep, ConditionType, ConditionConfig, computeNextCronRun, cronToHumanReadable } from '../../stores/taskStore';
import { useHRPStore, DEFAULT_SPEED } from '../../stores/hrpStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useA11yStore } from '../../stores/a11yStore';
import { t, type Locale } from '../../i18n';
import { executeTaskChain, cancelExecution } from '../../ros/taskExecutor';

type TaskTab = 'chains' | 'schedule' | 'conditions' | 'board';

export function TaskPanel() {
  const [tab, setTab] = useState<TaskTab>('chains');
  const locale = useA11yStore((s) => s.locale);

  const tabs: { key: TaskTab; label: string; icon: string }[] = [
    { key: 'chains', label: t('Chains', locale), icon: '🔗' },
    { key: 'schedule', label: t('Schedule', locale), icon: '⏰' },
    { key: 'conditions', label: t('Triggers', locale), icon: '⚡' },
    { key: 'board', label: t('Board', locale), icon: '📋' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-0.5">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 text-[10px] px-1 py-1 rounded cursor-pointer ${tab === tb.key ? 'bg-blue-600 text-white font-bold' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>
      {tab === 'chains' && <ChainEditorTab />}
      {tab === 'schedule' && <ScheduleTab />}
      {tab === 'conditions' && <ConditionsTab />}
      {tab === 'board' && <BoardTab />}
    </div>
  );
}

function ChainEditorTab() {
  const chains = useTaskStore((s) => s.chains);
  const selectedChainId = useTaskStore((s) => s.selectedChainId);
  const selectedChain = chains.find((c) => c.id === selectedChainId);
  const locale = useA11yStore((s) => s.locale);
  const robots = useFleetStore((s) => s.robots);
  const activeRobotId = useFleetStore((s) => s.activeRobotId);
  const hrpPath = useHRPStore((s) => s.path);
  const hrpSpeeds = useHRPStore((s) => s.segmentSpeeds);
  const store = useTaskStore();

  const handleAddChain = () => {
    store.addChain(`Task ${chains.length + 1}`);
  };

  const handleAddPathStep = () => {
    if (!selectedChainId || hrpPath.length < 2) return;
    store.addStepToChain(selectedChainId, {
      id: `step-${Date.now()}`,
      type: 'path',
      path: [...hrpPath],
      speeds: hrpSpeeds.length > 0 ? [...hrpSpeeds] : new Array(hrpPath.length - 1).fill(DEFAULT_SPEED),
      waypoint: null,
      waitDuration: 0,
    });
  };

  const handleAddWaypointStep = () => {
    if (!selectedChainId) return;
    const bot = robots.find((r) => r.id === activeRobotId);
    if (!bot) return;
    store.addStepToChain(selectedChainId, {
      id: `step-${Date.now()}`,
      type: 'waypoint',
      path: [],
      speeds: [],
      waypoint: { x: bot.pose.x + 1, z: bot.pose.z + 1 },
      waitDuration: 0,
    });
  };

  const handleAddWaitStep = () => {
    if (!selectedChainId) return;
    store.addStepToChain(selectedChainId, {
      id: `step-${Date.now()}`,
      type: 'wait',
      path: [],
      speeds: [],
      waypoint: null,
      waitDuration: 5,
    });
  };

  const handleRunChain = (chainId: string) => {
    executeTaskChain(chainId, activeRobotId);
  };

  const handleDragStep = (fromIndex: number, toIndex: number) => {
    if (!selectedChainId) return;
    store.reorderStep(selectedChainId, fromIndex, toIndex);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <button onClick={handleAddChain} className="flex-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded">
          + {t('New Chain', locale)}
        </button>
      </div>

      {chains.length > 0 && (
        <div className="max-h-24 overflow-y-auto space-y-0.5">
          {chains.map((chain) => (
            <div
              key={chain.id}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer ${selectedChainId === chain.id ? 'bg-blue-600/40 ring-1 ring-blue-400' : 'bg-gray-700/50 hover:bg-gray-600/50'}`}
              onClick={() => store.setSelectedChainId(chain.id)}
            >
              <span className="text-gray-300 flex-1 truncate">{chain.name}</span>
              <span className="text-[10px] text-gray-500">{chain.steps.length}{t('steps', locale)}</span>
              <button
                onMouseDown={(e) => { e.stopPropagation(); handleRunChain(chain.id); }}
                className="text-[10px] bg-green-700/60 hover:bg-green-600/60 text-green-200 px-1 py-0.5 rounded shrink-0"
              >
                ▶
              </button>
              <button
                onMouseDown={(e) => { e.stopPropagation(); store.duplicateChain(chain.id); }}
                className="text-[10px] text-gray-400 hover:text-white px-0.5 shrink-0"
              >
                ⧉
              </button>
              <button
                onMouseDown={(e) => { e.stopPropagation(); store.removeChain(chain.id); }}
                className="text-red-400 hover:text-red-300 px-0.5 shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedChain && (
        <div className="space-y-1.5">
          <input
            type="text"
            value={selectedChain.name}
            onChange={(e) => store.renameChain(selectedChain.id, e.target.value)}
            className="w-full text-xs bg-gray-700 text-white px-2 py-1 rounded"
            aria-label={t('Chain name', locale)}
          />

          <div className="flex gap-1">
            <button onClick={handleAddPathStep} disabled={hrpPath.length < 2} className="flex-1 text-[10px] bg-purple-700/60 hover:bg-purple-600/60 disabled:bg-gray-700 disabled:text-gray-500 text-purple-200 px-1 py-1 rounded">
              + {t('Path', locale)}
            </button>
            <button onClick={handleAddWaypointStep} className="flex-1 text-[10px] bg-cyan-700/60 hover:bg-cyan-600/60 text-cyan-200 px-1 py-1 rounded">
              + {t('Waypoint', locale)}
            </button>
            <button onClick={handleAddWaitStep} className="flex-1 text-[10px] bg-amber-700/60 hover:bg-amber-600/60 text-amber-200 px-1 py-1 rounded">
              + {t('Wait', locale)}
            </button>
          </div>

          {selectedChain.steps.length > 0 && (
            <div className="space-y-0.5">
              {selectedChain.steps.map((step, i) => (
                <StepItem
                  key={step.id}
                  step={step}
                  index={i}
                  total={selectedChain.steps.length}
                  onRemove={() => store.removeStepFromChain(selectedChain.id, i)}
                  onDrag={handleDragStep}
                  onUpdate={(updates) => store.updateStep(selectedChain.id, i, updates)}
                  locale={locale}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => handleRunChain(selectedChain.id)}
            className="w-full text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded"
          >
            ▶ {t('Run Chain', locale)}
          </button>
        </div>
      )}
    </div>
  );
}

function StepItem({ step, index, total: _total, onRemove, onDrag, onUpdate, locale }: {
  step: TaskStep;
  index: number;
  total: number;
  onRemove: () => void;
  onDrag: (from: number, to: number) => void;
  onUpdate: (updates: Partial<TaskStep>) => void;
  locale: Locale;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeIcon: Record<string, string> = { path: '📍', waypoint: '📌', wait: '⏳' };
  const typeColor: Record<string, string> = { path: 'text-purple-300', waypoint: 'text-cyan-300', wait: 'text-amber-300' };

  return (
    <div
      className={`text-[10px] rounded bg-gray-700/50 ${step.type === 'waypoint' && expanded ? 'ring-1 ring-cyan-500/50' : ''}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(index)); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDrop={(e) => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!isNaN(fromIdx) && fromIdx !== index) onDrag(fromIdx, index);
      }}
    >
      <div className="flex items-center gap-1 px-2 py-1 cursor-pointer" onClick={() => {
        if (step.type === 'wait') return;
        const nextExpanded = !expanded;
        setExpanded(nextExpanded);
        useTaskStore.getState().setEditingStepIndex(
          nextExpanded && step.type === 'waypoint' ? index : null
        );
      }}>
        <span className="text-gray-500 cursor-grab">⠿</span>
        <span className="text-gray-400 w-4">{index + 1}</span>
        <span className={typeColor[step.type]}>{typeIcon[step.type]}</span>
        <span className="text-gray-300 flex-1 truncate">
          {step.type === 'path' && `${step.path.length}${t('pts', locale)}`}
          {step.type === 'waypoint' && step.waypoint && `(${step.waypoint.x.toFixed(1)}, ${step.waypoint.z.toFixed(1)})`}
          {step.type === 'wait' && `${step.waitDuration}s`}
        </span>
        {step.type === 'wait' && (
          <input
            type="number"
            min={1}
            max={300}
            value={step.waitDuration}
            onChange={(e) => onUpdate({ waitDuration: Math.max(1, parseInt(e.target.value) || 1) })}
            onClick={(e) => e.stopPropagation()}
            className="w-10 text-[10px] bg-gray-600 text-white px-1 py-0.5 rounded text-right"
          />
        )}
        {step.type === 'waypoint' && <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>}
        {step.type === 'path' && <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>}
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-red-400 hover:text-red-300 px-0.5">✕</button>
      </div>
      {expanded && step.type === 'waypoint' && step.waypoint && (
        <div className="px-2 pb-1.5 pt-0.5 space-y-1 border-t border-gray-600/30" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">X:</span>
            <input
              type="number" step={0.1}
              value={step.waypoint.x.toFixed(2)}
              onChange={(e) => onUpdate({ waypoint: { ...step.waypoint!, x: parseFloat(e.target.value) || 0 } })}
              className="w-16 text-[10px] bg-gray-600 text-cyan-300 px-1 py-0.5 rounded text-right"
            />
            <span className="text-[10px] text-gray-500">Z:</span>
            <input
              type="number" step={0.1}
              value={step.waypoint.z.toFixed(2)}
              onChange={(e) => onUpdate({ waypoint: { ...step.waypoint!, z: parseFloat(e.target.value) || 0 } })}
              className="w-16 text-[10px] bg-gray-600 text-cyan-300 px-1 py-0.5 rounded text-right"
            />
          </div>
          <div className="text-[10px] text-gray-500">{t('Click map to set position', locale)}</div>
        </div>
      )}
      {expanded && step.type === 'path' && step.path.length >= 2 && (
        <div className="px-2 pb-1.5 pt-0.5 space-y-0.5 border-t border-gray-600/30" onClick={(e) => e.stopPropagation()}>
          <div className="text-[10px] text-gray-500">{step.path.length} {t('pts', locale)}, {step.speeds.length || step.path.length - 1} {t('segments', locale)}</div>
          {step.path.slice(0, 5).map((p, pi) => (
            <div key={pi} className="text-[9px] text-gray-400 font-mono">
              {pi + 1}: ({p.x.toFixed(2)}, {p.z.toFixed(2)}){step.speeds[pi] ? ` @ ${step.speeds[pi]}m/s` : ''}
            </div>
          ))}
          {step.path.length > 5 && <div className="text-[9px] text-gray-500">... +{step.path.length - 5}</div>}
        </div>
      )}
    </div>
  );
}

function ScheduleTab() {
  const scheduledTasks = useTaskStore((s) => s.scheduledTasks);
  const chains = useTaskStore((s) => s.chains);
  const robots = useFleetStore((s) => s.robots);
  const locale = useA11yStore((s) => s.locale);
  const store = useTaskStore();

  const [chainId, setChainId] = useState(chains[0]?.id || '');
  const [robotId, setRobotId] = useState(robots[0]?.id || '');
  const [cronMinute, setCronMinute] = useState('0');
  const [cronHour, setCronHour] = useState('8');
  const [cronDayOfWeek, setCronDayOfWeek] = useState('*');

  const handleAdd = () => {
    if (!chainId) return;
    store.addScheduledTask({
      name: `${chains.find((c) => c.id === chainId)?.name || 'Task'} @ ${cronHour}:${cronMinute}`,
      taskChainId: chainId,
      robotId,
      cron: {
        minute: cronMinute,
        hour: cronHour,
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: cronDayOfWeek,
      },
      enabled: true,
    });
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-2">
      {chains.length === 0 ? (
        <div className="text-xs text-gray-500">{t('Create a task chain first', locale)}</div>
      ) : (
        <>
          <div className="space-y-1">
            <select value={chainId} onChange={(e) => setChainId(e.target.value)} className="w-full text-[10px] bg-gray-700 text-white px-1 py-1 rounded">
              {chains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={robotId} onChange={(e) => setRobotId(e.target.value)} className="w-full text-[10px] bg-gray-700 text-white px-1 py-1 rounded">
              {robots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 w-8">{t('Hour:', locale)}</span>
              <input type="text" value={cronHour} onChange={(e) => setCronHour(e.target.value)} className="flex-1 text-[10px] bg-gray-700 text-white px-1 py-0.5 rounded" placeholder="8 or *" />
              <span className="text-[10px] text-gray-500 w-8">{t('Min:', locale)}</span>
              <input type="text" value={cronMinute} onChange={(e) => setCronMinute(e.target.value)} className="flex-1 text-[10px] bg-gray-700 text-white px-1 py-0.5 rounded" placeholder="0 or *" />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-gray-500 mr-1">{t('Day:', locale)}</span>
              {dayLabels.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setCronDayOfWeek(cronDayOfWeek === String(i) ? '*' : String(i))}
                  className={`text-[10px] px-1 py-0.5 rounded ${cronDayOfWeek === String(i) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => setCronDayOfWeek('*')}
                className={`text-[10px] px-1 py-0.5 rounded ${cronDayOfWeek === '*' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
              >
                {t('Every', locale)}
              </button>
            </div>
          </div>
          <button onClick={handleAdd} className="w-full text-[10px] bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded">
            + {t('Add Schedule', locale)}
          </button>
        </>
      )}

      {scheduledTasks.length > 0 && (
        <div className="space-y-0.5 max-h-32 overflow-y-auto">
          {scheduledTasks.map((st) => {
            const nextRun = computeNextCronRun(st.cron);
            return (
              <div key={st.id} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-700/50">
                <button
                  onMouseDown={(e) => { e.stopPropagation(); store.toggleScheduledTask(st.id); }}
                  className={`px-1 rounded ${st.enabled ? 'text-green-400' : 'text-gray-600'}`}
                >
                  {st.enabled ? '●' : '○'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 truncate">{st.name}</div>
                  <div className="text-gray-500">{cronToHumanReadable(st.cron)}</div>
                  {nextRun && st.enabled && <div className="text-blue-400">Next: {nextRun.toLocaleTimeString()}</div>}
                </div>
                <button onMouseDown={(e) => { e.stopPropagation(); store.removeScheduledTask(st.id); }} className="text-red-400 hover:text-red-300 px-0.5">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConditionsTab() {
  const conditionalTasks = useTaskStore((s) => s.conditionalTasks);
  const chains = useTaskStore((s) => s.chains);
  const robots = useFleetStore((s) => s.robots);
  const locale = useA11yStore((s) => s.locale);
  const store = useTaskStore();

  const [chainId, setChainId] = useState(chains[0]?.id || '');
  const [robotId, setRobotId] = useState(robots[0]?.id || '');
  const [condType, setCondType] = useState<ConditionType>('battery_low');
  const [threshold, setThreshold] = useState(20);
  const [timeoutSec, setTimeoutSec] = useState(300);

  const handleAdd = () => {
    if (!chainId) return;
    const condConfig: ConditionConfig = {
      type: condType,
      threshold: condType === 'idle_timeout' ? 0 : threshold,
      timeoutSeconds: condType === 'idle_timeout' ? timeoutSec : 0,
    };
    store.addConditionalTask({
      name: `${condType === 'battery_low' ? t('Battery <', locale) + threshold + '%' : condType === 'battery_critical' ? t('Battery <', locale) + threshold + '%' : t('Idle >', locale) + timeoutSec + 's'} → ${chains.find((c) => c.id === chainId)?.name || ''}`,
      taskChainId: chainId,
      robotId,
      condition: condConfig,
      enabled: true,
    });
  };

  return (
    <div className="space-y-2">
      {chains.length === 0 ? (
        <div className="text-xs text-gray-500">{t('Create a task chain first', locale)}</div>
      ) : (
        <>
          <div className="space-y-1">
            <select value={chainId} onChange={(e) => setChainId(e.target.value)} className="w-full text-[10px] bg-gray-700 text-white px-1 py-1 rounded">
              {chains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={robotId} onChange={(e) => setRobotId(e.target.value)} className="w-full text-[10px] bg-gray-700 text-white px-1 py-1 rounded">
              {robots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <select value={condType} onChange={(e) => setCondType(e.target.value as ConditionType)} className="w-full text-[10px] bg-gray-700 text-white px-1 py-1 rounded">
              <option value="battery_low">{t('Battery Low', locale)}</option>
              <option value="battery_critical">{t('Battery Critical', locale)}</option>
              <option value="idle_timeout">{t('Idle Timeout', locale)}</option>
            </select>
            {condType !== 'idle_timeout' ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">{t('Battery <', locale)}</span>
                <input type="number" min={5} max={50} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value) || 20)} className="w-12 text-[10px] bg-gray-700 text-white px-1 py-0.5 rounded text-right" />
                <span className="text-[10px] text-gray-500">%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">{t('Idle >', locale)}</span>
                <input type="number" min={10} max={3600} value={timeoutSec} onChange={(e) => setTimeoutSec(parseInt(e.target.value) || 300)} className="w-14 text-[10px] bg-gray-700 text-white px-1 py-0.5 rounded text-right" />
                <span className="text-[10px] text-gray-500">s</span>
              </div>
            )}
          </div>
          <button onClick={handleAdd} className="w-full text-[10px] bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded">
            + {t('Add Trigger', locale)}
          </button>
        </>
      )}

      {conditionalTasks.length > 0 && (
        <div className="space-y-0.5 max-h-32 overflow-y-auto">
          {conditionalTasks.map((ct) => (
            <div key={ct.id} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-700/50">
              <button
                onMouseDown={(e) => { e.stopPropagation(); store.toggleConditionalTask(ct.id); }}
                className={`px-1 rounded ${ct.enabled ? 'text-yellow-400' : 'text-gray-600'}`}
              >
                {ct.enabled ? '⚡' : '○'}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-gray-300 truncate">{ct.name}</div>
                {ct.lastTriggered && <div className="text-gray-500">{t('Last:', locale)} {new Date(ct.lastTriggered).toLocaleTimeString()}</div>}
              </div>
              <button onMouseDown={(e) => { e.stopPropagation(); store.removeConditionalTask(ct.id); }} className="text-red-400 hover:text-red-300 px-0.5">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BoardTab() {
  const executions = useTaskStore((s) => s.executions);
  const robots = useFleetStore((s) => s.robots);
  const locale = useA11yStore((s) => s.locale);
  const store = useTaskStore();

  const columns: { status: string; label: string; color: string }[] = [
    { status: 'pending', label: t('Pending', locale), color: 'border-gray-500' },
    { status: 'running', label: t('Running', locale), color: 'border-blue-500' },
    { status: 'completed', label: t('Completed', locale), color: 'border-green-500' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {columns.map((col) => {
          const items = executions.filter((e) => e.status === col.status);
          return (
            <div key={col.status} className="flex-1 min-w-0">
              <div className={`text-[10px] font-bold text-gray-300 border-b-2 ${col.color} pb-0.5 mb-1`}>
                {col.label} ({items.length})
              </div>
              <div className="space-y-0.5">
                {items.slice(-5).reverse().map((exec) => (
                  <div key={exec.id} className="text-[9px] px-1.5 py-1 rounded bg-gray-700/50 space-y-0.5">
                    <div className="text-gray-300 truncate font-medium">{exec.taskChainName}</div>
                    <div className="text-gray-500">
                      {robots.find((r) => r.id === exec.robotId)?.name || exec.robotId}
                    </div>
                    {exec.status === 'running' && (
                      <div className="text-blue-400">
                        {t('Step', locale)} {exec.currentStep + 1}/{exec.totalSteps}
                        <div className="w-full bg-gray-600 rounded h-1 mt-0.5">
                          <div className="bg-blue-500 h-1 rounded" style={{ width: `${((exec.currentStep + 1) / exec.totalSteps) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {exec.status === 'running' && (
                      <button
                        onMouseDown={(e) => { e.stopPropagation(); cancelExecution(exec.id); }}
                        className="text-[9px] bg-red-700/60 hover:bg-red-600/60 text-red-200 px-1 py-0.5 rounded w-full"
                      >
                        {t('Cancel', locale)}
                      </button>
                    )}
                    {exec.completedAt && (
                      <div className="text-gray-500">{new Date(exec.completedAt).toLocaleTimeString()}</div>
                    )}
                    {exec.status === 'failed' && exec.error && (
                      <div className="text-red-400">{exec.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <div className="text-[10px] text-gray-500">
          {t('Battery:', locale)} {robots.find((r) => r.id === useFleetStore.getState().activeRobotId)?.battery.toFixed(0) || '—'}%
        </div>
        <div className="flex-1 bg-gray-700 rounded h-1.5">
          <div
            className="h-1.5 rounded transition-all"
            style={{
              width: `${robots.find((r) => r.id === useFleetStore.getState().activeRobotId)?.battery || 0}%`,
              backgroundColor: (robots.find((r) => r.id === useFleetStore.getState().activeRobotId)?.battery || 100) > 20 ? '#4caf50' : (robots.find((r) => r.id === useFleetStore.getState().activeRobotId)?.battery || 100) > 10 ? '#ff9800' : '#f44336',
            }}
          />
        </div>
      </div>

      {executions.length > 0 && (
        <button onClick={() => store.clearExecutions()} className="w-full text-[10px] bg-red-700/60 hover:bg-red-600/60 text-red-200 px-1.5 py-1 rounded">
          {t('Clear History', locale)}
        </button>
      )}
    </div>
  );
}
