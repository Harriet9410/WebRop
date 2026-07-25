import { Ros, Topic } from 'roslib';
import { useRosStore } from '../stores/rosStore';
import { useMapStore } from '../stores/mapStore';
import { useFleetStore } from '../stores/fleetStore';
import { useNavPlanStore } from '../stores/navPlanStore';
import { useAmclStore } from '../stores/amclStore';
import { useHololensStore } from '../stores/hololensStore';
import { useScanStore } from '../stores/scanStore';
import { OccupancyGridData } from '../utils/mapRenderer';
import { saveMapToFiles, addMapMeta } from '../utils/mapSaver';
import { quaternionToYaw, yawToQuaternion } from '../utils/coordinate';
import type { SegmentSpeed } from '../stores/hrpStore';
import type { RosMsg_OccupancyGrid, RosMsg_Odometry, RosMsg_Path, RosMsg_LaserScan, RosMsg_CompressedImage, RosMsg_GoalStatusArray, RosMsg_BatteryState } from './types';

let ros: Ros | null = null;
let mapSub: Topic | null = null;
let odomSub: Topic | null = null;
let navPlanSub: Topic | null = null;
let hrpPathSub: Topic | null = null;
let hrpDraftSub: Topic | null = null;
let particleSub: Topic | null = null;
let cmdVelTopic: Topic | null = null;
let scanSub: Topic | null = null;
let cameraSub: Topic | null = null;
let hololensSub: Topic | null = null;
let moveBaseStatusSub: Topic | null = null;
let batterySub: Topic | null = null;
let amclPoseSub: Topic | null = null;
let amclPoseActive = false; // 收到 /amcl_pose 或乐观重定位后置 true，抑制 /odom 覆盖位置
let mapOriginX = 0;
let mapOriginY = 0;
let mapResolution = 0.05;
let mapHeight = 0;

function rosToScene(rx: number, ry: number): { x: number; z: number } {
  return {
    x: rx - mapOriginX,
    z: mapOriginY + mapHeight * mapResolution - ry,
  };
}

function sceneToRos(sx: number, sz: number): { x: number; y: number } {
  return {
    x: sx + mapOriginX,
    y: mapOriginY + mapHeight * mapResolution - sz,
  };
}

export function connect(url?: string): void {
  const store = useRosStore.getState();
  const wsUrl = url || store.url;
  store.setStatus('connecting');

  ros = new Ros({ url: wsUrl });

  ros.on('connection', () => {
    useRosStore.getState().setStatus('connected');
    useRosStore.getState().addRosLog({ direction: 'sys', topic: 'rosbridge', summary: 'Connected' });
    subscribeAll();
  });

  ros.on('error', () => {
    useRosStore.getState().setStatus('error');
    useRosStore.getState().addRosLog({ direction: 'sys', topic: 'rosbridge', summary: 'Connection error' });
  });

  ros.on('close', () => {
    const s = useRosStore.getState().status;
    if (s !== 'error') {
      useRosStore.getState().setStatus('disconnected');
    }
    useRosStore.getState().addRosLog({ direction: 'sys', topic: 'rosbridge', summary: 'Disconnected' });
  });
}

export function disconnect(): void {
  try { if (mapSub) { mapSub.unsubscribe(); mapSub = null; } } catch {}
  try { if (odomSub) { odomSub.unsubscribe(); odomSub = null; } } catch {}
  try { if (navPlanSub) { navPlanSub.unsubscribe(); navPlanSub = null; } } catch {}
  try { if (hrpPathSub) { hrpPathSub.unsubscribe(); hrpPathSub = null; } } catch {}
  try { if (hrpDraftSub) { hrpDraftSub.unsubscribe(); hrpDraftSub = null; } } catch {}
  try { useNavPlanStore.getState().clearHrpDraft(); } catch {}
  try { if (hololensSub) { hololensSub.unsubscribe(); hololensSub = null; } } catch {}
  try { useHololensStore.getState().clear(); } catch {}
  try { if (scanSub) { scanSub.unsubscribe(); scanSub = null; } } catch {}
  try { if (cameraSub) { cameraSub.unsubscribe(); cameraSub = null; } } catch {}
  try { if (moveBaseStatusSub) { moveBaseStatusSub.unsubscribe(); moveBaseStatusSub = null; } } catch {}
  try { if (batterySub) { batterySub.unsubscribe(); batterySub = null; } } catch {}
  try { if (amclPoseSub) { amclPoseSub.unsubscribe(); amclPoseSub = null; } } catch {}
  amclPoseActive = false;
  cmdVelTopic = null;
  try { if (ros) { ros.close(); ros = null; } } catch {}
  useRosStore.getState().setStatus('disconnected');
  useMapStore.getState().setGrid(null as any);
  useFleetStore.getState().setRobotPose(useFleetStore.getState().activeRobotId, { x: 2, z: 2, yaw: 0 });
  useNavPlanStore.getState().clearMoveBasePlan();
  useScanStore.getState().clearScan();
}

function subscribeAll(): void {
  if (!ros) return;

  mapSub = new Topic({
    ros,
    name: '/map',
    messageType: 'nav_msgs/OccupancyGrid',
    throttle_rate: 500,
  });

  mapSub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_OccupancyGrid;
    mapOriginX = m.info.origin.position.x;
    mapOriginY = m.info.origin.position.y;
    mapResolution = m.info.resolution;
    mapHeight = m.info.height;
    const grid: OccupancyGridData = {
      width: m.info.width,
      height: m.info.height,
      resolution: m.info.resolution,
      originX: m.info.origin.position.x,
      originY: m.info.origin.position.y,
      data: m.data,
    };
    useMapStore.getState().setGrid(grid);
  });

  odomSub = new Topic({
    ros,
    name: '/odom',
    messageType: 'nav_msgs/Odometry',
    throttle_rate: 100,
  });

  odomSub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_Odometry;
    const p = m.pose.pose.position;
    const q = m.pose.pose.orientation;
    const rosYaw = quaternionToYaw(q.x, q.y, q.z, q.w);
    const scenePos = rosToScene(p.x, p.y);
    // /amcl_pose(map 系定位)是位置主源；没收到时才用 /odom 兜底位置，否则只更新速度
    if (!amclPoseActive) {
      useFleetStore.getState().setRobotPose(useFleetStore.getState().activeRobotId, {
        x: scenePos.x,
        z: scenePos.z,
        yaw: Math.PI / 2 - rosYaw,
      });
    }
    useFleetStore.getState().setRobotVelocity(useFleetStore.getState().activeRobotId,
      m.twist.twist.linear.x,
      m.twist.twist.angular.z
    );
  });

  // AMCL 的 map 系定位结果：用它驱动小车位置（重定位时会跳、且与地图对齐）；收到后抑制 /odom 覆盖
  amclPoseSub = new Topic({
    ros,
    name: '/amcl_pose',
    messageType: 'geometry_msgs/PoseWithCovarianceStamped',
    throttle_rate: 100,
  });

  amclPoseSub.subscribe((msg: unknown) => {
    const m = msg as { pose: { pose: { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number } } } };
    const p = m.pose.pose.position;
    const q = m.pose.pose.orientation;
    const rosYaw = quaternionToYaw(q.x, q.y, q.z, q.w);
    const scenePos = rosToScene(p.x, p.y);
    amclPoseActive = true;
    useFleetStore.getState().setRobotPose(useFleetStore.getState().activeRobotId, {
      x: scenePos.x,
      z: scenePos.z,
      yaw: Math.PI / 2 - rosYaw,
    });
  });

  // HL2 头部位姿（/hololens/pose）→ 显示标记
  hololensSub = new Topic({
    ros,
    name: '/hololens/pose',
    messageType: 'geometry_msgs/PoseStamped',
    throttle_rate: 100,
  });

  hololensSub.subscribe((msg: unknown) => {
    const m = msg as { pose: { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number } } };
    const p = m.pose.position;
    const q = m.pose.orientation;
    const rosYaw = quaternionToYaw(q.x, q.y, q.z, q.w);
    const scenePos = rosToScene(p.x, p.y);
    useHololensStore.getState().setPose({
      x: scenePos.x,
      z: scenePos.z,
      yaw: Math.PI / 2 - rosYaw,
      connected: true,
    });
  });

  navPlanSub = new Topic({
    ros,
    name: '/move_base/NavfnROS/plan',
    messageType: 'nav_msgs/Path',
    throttle_rate: 500,
  });

  navPlanSub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_Path;
    const scenePath = m.poses.map((p) => rosToScene(p.pose.position.x, p.pose.position.y));
    useNavPlanStore.getState().setMoveBasePlan(scenePath);
  });

  // 收 /hrp_path（WebRop 自画 或 HoloLens2/Unity 发），转场景坐标存 store，供地图叠显
  hrpPathSub = new Topic({
    ros,
    name: '/hrp_path',
    messageType: 'nav_msgs/Path',
  });
  hrpPathSub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_Path;
    const scenePath = m.poses.map((p) => rosToScene(p.pose.position.x, p.pose.position.y));
    useNavPlanStore.getState().setHrpPath(scenePath);
  });

  // 收 /hrp_draft（HL2 画线时的实时草稿，不触发车）→ 青色叠显；空 Path = 清屏
  hrpDraftSub = new Topic({
    ros,
    name: '/hrp_draft',
    messageType: 'nav_msgs/Path',
  });
  hrpDraftSub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_Path;
    const scenePath = m.poses.map((p) => rosToScene(p.pose.position.x, p.pose.position.y));
    useNavPlanStore.getState().setHrpDraft(scenePath);
  });

  cmdVelTopic = new Topic({
    ros,
    name: '/teleop_vel',
    messageType: 'geometry_msgs/Twist',
  });

  particleSub = new Topic({
    ros,
    name: '/particlecloud',
    messageType: 'geometry_msgs/PoseArray',
    throttle_rate: 500,
  });

  particleSub.subscribe((msg: unknown) => {
    const m = msg as { poses: { position: { x: number; y: number; number: number }; orientation: { x: number; y: number; z: number; w: number } }[] };
    const particles = m.poses.map((p) => {
      const scenePos = rosToScene(p.position.x, p.position.y);
      const rosYaw = quaternionToYaw(p.orientation.x, p.orientation.y, p.orientation.z, p.orientation.w);
      return {
        x: scenePos.x,
        z: scenePos.z,
        yaw: Math.PI / 2 - rosYaw,
        weight: 1 / m.poses.length,
      };
    });
    useAmclStore.getState().setParticles(particles);
  });

  scanSub = new Topic({
    ros,
    name: '/scan',
    messageType: 'sensor_msgs/LaserScan',
    throttle_rate: 200,
  });

  scanSub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_LaserScan;
    // 只存原始激光数据，不在此处算点位（点位改由 LaserScanVisual 每帧用实时位姿重算）。
    useScanStore.getState().setScanData(
      m.ranges, m.angle_min, m.angle_increment, m.range_min, m.range_max
    );
  });

  cameraSub = new Topic({
    ros,
    name: '/camera/rgb/image_raw/compressed',
    messageType: 'sensor_msgs/CompressedImage',
    throttle_rate: 500,
  });

  cameraSub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_CompressedImage;
    if (m.data) {
      const prefix = m.format.includes('png') ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';
      useScanStore.getState().setCameraImage(prefix + m.data);
    }
  });

  moveBaseStatusSub = new Topic({
    ros,
    name: '/move_base/status',
    messageType: 'actionlib_msgs/GoalStatusArray',
    throttle_rate: 200,
  });

  moveBaseStatusSub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_GoalStatusArray;
    const fleet = useFleetStore.getState();
    const bot = fleet.robots.find((r) => r.id === fleet.activeRobotId);
    if (!bot || !bot.navigating) return;

    for (const s of m.status_list) {
      if (s.status === 3) {
        const nextIdx = bot.currentWaypointIdx + 1;
        if (nextIdx < bot.waypoints.length) {
          fleet.setCurrentWaypointIdx(fleet.activeRobotId, nextIdx);
          const wp = bot.waypoints[nextIdx];
          publishNavGoal(wp.x, wp.z, wp.targetYaw ?? 0);
          useRosStore.getState().addRosLog({ direction: 'sys', topic: '/move_base/status', summary: `Goal reached, advancing to WP ${nextIdx + 1}` });
        } else {
          fleet.clearNav(fleet.activeRobotId);
          useRosStore.getState().addRosLog({ direction: 'sys', topic: '/move_base/status', summary: 'All goals reached' });
        }
        break;
      } else if (s.status === 4 || s.status === 5) {
        fleet.clearNav(fleet.activeRobotId);
        useRosStore.getState().addRosLog({ direction: 'sys', topic: '/move_base/status', summary: `Goal failed: ${s.text || 'aborted'}` });
        break;
      }
    }
  });

  batterySub = new Topic({
    ros,
    name: '/battery_state',
    messageType: 'sensor_msgs/BatteryState',
    throttle_rate: 5000,
  });

  batterySub.subscribe((msg: unknown) => {
    const m = msg as RosMsg_BatteryState;
    const fleet = useFleetStore.getState();
    fleet.setRobotBattery(fleet.activeRobotId, m.percentage * 100);
  });
}

export function getRos(): Ros | null {
  return ros;
}

export function publishNavGoal(x: number, z: number, yaw: number = 0): void {
  if (!ros) return;
  const rosPos = sceneToRos(x, z);
  const rosYaw = Math.PI / 2 - yaw;
  const topic = new Topic({
    ros,
    name: '/move_base_simple/goal',
    messageType: 'geometry_msgs/PoseStamped',
  });
  const msg = {
    header: {
      frame_id: 'map',
      stamp: { secs: Math.floor(Date.now() / 1000), nsecs: 0 },
    },
    pose: {
      position: { x: rosPos.x, y: rosPos.y, z: 0 },
      orientation: { x: 0, y: 0, z: Math.sin(rosYaw / 2), w: Math.cos(rosYaw / 2) },
    },
  };
  topic.publish(msg as never);
  useRosStore.getState().addRosLog({ direction: 'out', topic: '/move_base_simple/goal', summary: `→ (${rosPos.x.toFixed(2)}, ${rosPos.y.toFixed(2)})` });
}

export function publishWaypointGoals(waypoints: { x: number; z: number }[]): void {
  if (!ros) return;
  const topic = new Topic({
    ros,
    name: '/waypoint_goals',
    messageType: 'std_msgs/String',
  });
  const data = waypoints.map((wp) => {
    const rosPos = sceneToRos(wp.x, wp.z);
    return { x: rosPos.x, y: rosPos.y };
  });
  topic.publish({ data: JSON.stringify(data) } as never);
}

export function publishHRZZones(json: string): void {
  if (!ros) return;
  const topic = new Topic({
    ros,
    name: '/hrz_zones',
    messageType: 'std_msgs/String',
  });
  topic.publish({ data: json } as never);
}

export function publishHRPPath(poses: { x: number; z: number }[]): void {
  if (!ros) return;
  const topic = new Topic({
    ros,
    name: '/hrp_path',
    messageType: 'nav_msgs/Path',
  });
  const pathMsg = {
    header: { frame_id: 'map' },
    poses: poses.map((p) => {
      const rosPos = sceneToRos(p.x, p.z);
      return {
        pose: {
          position: { x: rosPos.x, y: rosPos.y, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
      };
    }),
  };
  topic.publish(pathMsg as never);
}

export function publishHRPSpeeds(speeds: SegmentSpeed[]): void {
  if (!ros) return;
  const topic = new Topic({
    ros,
    name: '/hrp_speeds',
    messageType: 'std_msgs/String',
  });
  topic.publish({ data: JSON.stringify(speeds) } as never);
}

export function publishCmdVel(linearX: number, angularZ: number): void {
  if (!ros) return;
  if (!cmdVelTopic) {
    cmdVelTopic = new Topic({
      ros,
      name: '/teleop_vel',
      messageType: 'geometry_msgs/Twist',
    });
  }
  cmdVelTopic.publish({
    linear: { x: linearX, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: angularZ },
  } as never);
}

export function publishInitialPose(x: number, z: number, yaw: number): void {
  if (!ros) return;
  const rosPos = sceneToRos(x, z);
  const rosYaw = Math.PI / 2 - yaw;
  const q = yawToQuaternion(rosYaw);
  const topic = new Topic({
    ros,
    name: '/initialpose',
    messageType: 'geometry_msgs/PoseWithCovarianceStamped',
  });
  const msg = {
    header: {
      frame_id: 'map',
      stamp: { secs: Math.floor(Date.now() / 1000), nsecs: 0 },
    },
    pose: {
      pose: {
        position: { x: rosPos.x, y: rosPos.y, z: 0 },
        orientation: { x: q.x, y: q.y, z: q.z, w: q.w },
      },
      covariance: [
        0.25, 0, 0, 0, 0, 0,
        0, 0.25, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0.06853892326654787,
      ],
    },
  };
  topic.publish(msg as never);
  useAmclStore.getState().setPendingPose(null);
  useAmclStore.getState().setIsRelocating(false);
}

// 重定位：乐观地把小车立刻移到点击位置（即时反馈）+ 抑制 /odom 覆盖 + 发 /initialpose 让 AMCL 收敛
export function relocateRobot(x: number, z: number, yaw: number): void {
  amclPoseActive = true; // 抑制 /odom 把车拉回旧位置，等 /amcl_pose 接管
  useFleetStore.getState().setRobotPose(useFleetStore.getState().activeRobotId, { x, z, yaw });
  publishInitialPose(x, z, yaw);
}

// 两点校准·第二点提交：true2X/Z = 用户点第二下的 scene 坐标。
// 用两点(raw₁→raw₂ vs 真实₁→真实₂)在 scene 空间直接量出位置旋转 R 与平移 T（构造自洽，一次到位）；
// 朝向偏角 dyaw 已在第一点拖拽时量好。位置/朝向各在自己的空间量，不做跨帧换算。
export function finishHololensCalibration(true2X: number, true2Z: number): void {
  const p1 = useHololensStore.getState().calibPoint1;
  const pose = useHololensStore.getState().pose;
  if (!p1 || !pose) {
    useHololensStore.getState().setCalibPoint1(null);
    useHololensStore.getState().setCalibrating(false);
    return;
  }
  const raw2X = pose.x;
  const raw2Z = pose.z;

  // 两点太近 → 旋转量不出来，提示并保持第二阶段（不清 calibPoint1），让用户点远一点
  const vRawX = raw2X - p1.rawX;
  const vRawZ = raw2Z - p1.rawZ;
  const rawStep = Math.hypot(vRawX, vRawZ);
  if (rawStep < 0.3) {
    useRosStore.getState().addRosLog({
      direction: 'out',
      topic: '/hololens/alignment',
      summary: `两点太近(HL2 实测只移了 ${rawStep.toFixed(2)}m)，请走远一点再点第二下`,
    });
    return; // 不清状态，保持在第二阶段
  }

  // ---- 标记位置仿射（scene 空间，两点量出）----
  // R = ∠(raw₂−raw₁ → 真实₂−真实₁)，测量与应用同坐标系 → 自洽，无符号猜测。
  const vTrueX = true2X - p1.trueX;
  const vTrueZ = true2Z - p1.trueZ;
  const cross = vRawX * vTrueZ - vRawZ * vTrueX;
  const dot = vRawX * vTrueX + vRawZ * vTrueZ;
  const rot = Math.atan2(cross, dot);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const rotRaw1X = c * p1.rawX - s * p1.rawZ;
  const rotRaw1Z = s * p1.rawX + c * p1.rawZ;
  const tx = p1.trueX - rotRaw1X;
  const tz = p1.trueZ - rotRaw1Z;
  useHololensStore.getState().setOffset({ tx, tz, rot, dyaw: p1.dyaw });

  // ---- 路径对齐（best-effort，沿用上一轮的帧假设：用第一点 + dyaw）----
  // 注意：路径(PathSender)走 UnityToROS、标记走 (-x,-z)，两帧不同；这里按标记帧算的仿射
  //       发给 PathSender。carRelative=ON 时路径锚在车上不受影响；OFF 时若发现路径与标记差 90°，
  //       说明需要单独标定路径帧（待办）。当前行为与上一轮一致，不会更差。
  if (ros) {
    const theta = -p1.dyaw;
    const rawRos1 = sceneToRos(p1.rawX, p1.rawZ);
    const trueRos1 = sceneToRos(p1.trueX, p1.trueZ);
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const rotRR1X = ct * rawRos1.x - st * rawRos1.y;
    const rotRR1Y = st * rawRos1.x + ct * rawRos1.y;
    const originX = trueRos1.x - rotRR1X;
    const originY = trueRos1.y - rotRR1Y;
    const topic = new Topic({ ros, name: '/hololens/alignment', messageType: 'geometry_msgs/Pose2D' });
    topic.publish({ x: originX, y: originY, theta } as never);
    useRosStore.getState().addRosLog({
      direction: 'out',
      topic: '/hololens/alignment',
      summary: `Calibrate(2pt): marker rot=${(rot * 180 / Math.PI).toFixed(0)}° dyaw=${(p1.dyaw * 180 / Math.PI).toFixed(0)}° path theta=${(theta * 180 / Math.PI).toFixed(0)}°`,
    });
  }

  // 清理校准状态
  useHololensStore.getState().setCalibPoint1(null);
  useHololensStore.getState().setCalibrating(false);
}

export function saveMap(mapName: string): void {
  const grid = useMapStore.getState().grid;
  if (!grid) return;

  saveMapToFiles(grid, mapName);
  addMapMeta({
    name: mapName || 'webrop_map',
    timestamp: Date.now(),
    width: grid.width,
    height: grid.height,
    resolution: grid.resolution,
    originX: grid.originX,
    originY: grid.originY,
  });
}

export function publishSlamCommand(command: string): void {
  if (!ros) return;
  const topic = new Topic({
    ros,
    name: '/webrop/slam_command',
    messageType: 'std_msgs/String',
  });
  topic.publish({ data: command } as never);
}

export function cancelNavGoal(): void {
  if (!ros) return;
  const topic = new Topic({
    ros,
    name: '/move_base/cancel',
    messageType: 'actionlib_msgs/GoalID',
  });
  topic.publish({ stamp: { secs: 0, nsecs: 0 }, id: '' } as never);
}

export { Ros, Topic };
