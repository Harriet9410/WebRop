import { useTaskStore, TaskStep, TaskChain } from '../stores/taskStore';
import { useFleetStore } from '../stores/fleetStore';
import { DEFAULT_SPEED } from '../stores/hrpStore';
import { useToastStore } from '../stores/toastStore';
import { mockPublishHRPPath, mockCancelNav } from './mock';
import { publishHRPPath, publishHRPSpeeds, publishNavGoal } from './connection';
import { useRosStore } from '../stores/rosStore';

let executorTimer: ReturnType<typeof setInterval> | null = null;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let conditionTimer: ReturnType<typeof setInterval> | null = null;

let currentWaitEnd: number | null = null;

export function startTaskEngine(): void {
  stopTaskEngine();
  executorTimer = setInterval(tickExecutor, 200);
  schedulerTimer = setInterval(tickScheduler, 30000);
  conditionTimer = setInterval(tickConditions, 1000);
}

export function stopTaskEngine(): void {
  if (executorTimer) { clearInterval(executorTimer); executorTimer = null; }
  if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
  if (conditionTimer) { clearInterval(conditionTimer); conditionTimer = null; }
}

export function executeTaskChain(chainId: string, robotId: string, source: { scheduledId?: string; conditionalId?: string } = {}): string | null {
  const store = useTaskStore.getState();
  const chain = store.chains.find((c) => c.id === chainId);
  if (!chain || chain.steps.length === 0) return null;

  const fleet = useFleetStore.getState();
  const bot = fleet.robots.find((r) => r.id === robotId);
  if (!bot) return null;

  if (bot.navigating) {
    useToastStore.getState().addToast(`Robot ${bot.name} is busy, cannot start task`, 'error');
    return null;
  }

  const execId = store.addExecution({
    taskChainId: chainId,
    taskChainName: chain.name,
    robotId,
    scheduledTaskId: source.scheduledId || null,
    conditionalTaskId: source.conditionalId || null,
    status: 'running',
    currentStep: 0,
    totalSteps: chain.steps.length,
    startedAt: Date.now(),
    completedAt: null,
    error: null,
  });

  startStep(chain.steps[0], robotId);
  useToastStore.getState().addToast(`Task "${chain.name}" started`, 'success');
  return execId;
}

function startStep(step: TaskStep, robotId: string): void {
  const isMock = useRosStore.getState().isMock;
  const fleet = useFleetStore.getState();

  switch (step.type) {
    case 'path': {
      if (step.path.length >= 2) {
        if (isMock) {
          mockPublishHRPPath(step.path, step.speeds.length > 0 ? step.speeds : undefined);
        } else {
          publishHRPPath(step.path);
          if (step.speeds.length > 0) publishHRPSpeeds(step.speeds);
        }
        fleet.setNavigating(robotId, true);
      }
      break;
    }
    case 'waypoint': {
      if (step.waypoint) {
        if (isMock) {
          mockPublishHRPPath([step.waypoint], [DEFAULT_SPEED]);
        } else {
          publishNavGoal(step.waypoint.x, step.waypoint.z);
        }
        fleet.setNavigating(robotId, true);
      }
      break;
    }
    case 'wait': {
      currentWaitEnd = Date.now() + step.waitDuration * 1000;
      break;
    }
  }
}

function tickExecutor(): void {
  const store = useTaskStore.getState();
  const running = store.executions.filter((e) => e.status === 'running');
  if (running.length === 0) return;

  for (const exec of running) {
    const chain = store.chains.find((c) => c.id === exec.taskChainId);
    if (!chain) {
      store.updateExecution(exec.id, { status: 'failed', error: 'Chain not found', completedAt: Date.now() });
      continue;
    }

    const step = chain.steps[exec.currentStep];
    if (!step) {
      store.updateExecution(exec.id, { status: 'completed', completedAt: Date.now() });
      useToastStore.getState().addToast(`Task "${chain.name}" completed`, 'success');
      continue;
    }

    const fleet = useFleetStore.getState();
    const bot = fleet.robots.find((r) => r.id === exec.robotId);
    if (!bot) {
      store.updateExecution(exec.id, { status: 'failed', error: 'Robot not found', completedAt: Date.now() });
      continue;
    }

    if (step.type === 'wait') {
      if (currentWaitEnd && Date.now() >= currentWaitEnd) {
        currentWaitEnd = null;
        advanceStep(exec.id, exec.currentStep, chain, bot.id);
      }
      continue;
    }

    if (!bot.navigating && (step.type === 'path' || step.type === 'waypoint')) {
      advanceStep(exec.id, exec.currentStep, chain, bot.id);
    }
  }
}

function advanceStep(execId: string, currentStep: number, chain: TaskChain, robotId: string): void {
  const store = useTaskStore.getState();
  const nextStep = currentStep + 1;

  if (nextStep >= chain.steps.length) {
    store.updateExecution(execId, {
      status: 'completed',
      currentStep: nextStep,
      completedAt: Date.now(),
    });
    useToastStore.getState().addToast(`Task "${chain.name}" completed`, 'success');
  } else {
    store.updateExecution(execId, { currentStep: nextStep });
    startStep(chain.steps[nextStep], robotId);
  }
}

export function cancelExecution(execId: string): void {
  const store = useTaskStore.getState();
  const exec = store.executions.find((e) => e.id === execId);
  if (!exec || exec.status !== 'running') return;

  const fleet = useFleetStore.getState();
  const isMock = useRosStore.getState().isMock;

  if (isMock) mockCancelNav();
  fleet.clearNav(exec.robotId);
  currentWaitEnd = null;

  store.updateExecution(execId, { status: 'cancelled', completedAt: Date.now() });
  useToastStore.getState().addToast(`Task cancelled`, 'info');
}

function tickScheduler(): void {
  const store = useTaskStore.getState();
  const now = new Date();

  for (const st of store.scheduledTasks) {
    if (!st.enabled) continue;

    const chain = store.chains.find((c) => c.id === st.taskChainId);
    if (!chain) continue;

    const cron = st.cron;
    const matches =
      (cron.minute === '*' || parseInt(cron.minute) === now.getMinutes()) &&
      (cron.hour === '*' || parseInt(cron.hour) === now.getHours()) &&
      (cron.dayOfMonth === '*' || parseInt(cron.dayOfMonth) === now.getDate()) &&
      (cron.month === '*' || parseInt(cron.month) === now.getMonth() + 1) &&
      (cron.dayOfWeek === '*' || parseInt(cron.dayOfWeek) === now.getDay());

    if (!matches) continue;

    if (st.lastRun && Date.now() - st.lastRun < 120000) continue;

    const alreadyRunning = store.executions.some(
      (e) => e.scheduledTaskId === st.id && e.status === 'running'
    );
    if (alreadyRunning) continue;

    const execId = executeTaskChain(st.taskChainId, st.robotId, { scheduledId: st.id });
    if (execId) {
      store.updateScheduledTask(st.id, { lastRun: Date.now() });
    }
  }
}

function tickConditions(): void {
  const store = useTaskStore.getState();
  const fleet = useFleetStore.getState();

  for (const ct of store.conditionalTasks) {
    if (!ct.enabled) continue;

    const bot = fleet.robots.find((r) => r.id === ct.robotId);
    if (!bot) continue;

    const alreadyRunning = store.executions.some(
      (e) => e.conditionalTaskId === ct.id && e.status === 'running'
    );
    if (alreadyRunning) continue;

    if (ct.lastTriggered && Date.now() - ct.lastTriggered < 60000) continue;

    let triggered = false;
    switch (ct.condition.type) {
      case 'battery_low':
        triggered = bot.battery <= ct.condition.threshold;
        break;
      case 'battery_critical':
        triggered = bot.battery <= ct.condition.threshold;
        break;
      case 'idle_timeout':
        triggered = bot.idleTime >= ct.condition.timeoutSeconds && !bot.navigating;
        break;
    }

    if (triggered) {
      const execId = executeTaskChain(ct.taskChainId, ct.robotId, { conditionalId: ct.id });
      if (execId) {
        store.updateConditionalTask(ct.id, { lastTriggered: Date.now() });
      }
    }
  }
}
