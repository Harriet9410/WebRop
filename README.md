# WebRop — Web Robot Operation Platform

[![React](https://img.shields.io/badge/React-18.3-61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-0.184-000000)](https://threejs.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-443E38)](https://github.com/pmndrs/zustand)
[![ROS](https://img.shields.io/badge/ROS-1-22314E)](https://ros.org)

## 概述

WebRop 是一个基于 Web 的机器人导航编辑与控制平台。用户在 3D 场景中手绘参考路径和限制区域，机器人按标注的约束执行导航。

项目起源于两篇学术论文：

- **MRHaD**（Kosaka et al., arXiv:2504.00580）— 手绘限制区域（HRZ）多边形编辑与 costmap 集成
- **MRReP**（Kosaka et al., arXiv:2604.00059）— 手绘参考路径（HRP）自由绘制与全局规划器集成

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript 6 |
| 3D 渲染 | Three.js 0.184 + @react-three/fiber 8 + @react-three/drei 9 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 4 |
| 构建工具 | Vite 8 |
| ROS 通信 | roslib 2（WebSocket 连接 rosbridge） |
| 多语言 | 简体中文 / English / 日本語 |

## 功能

### 3D 可视化

- **占用栅格地图渲染** — 将 ROS OccupancyGrid 数据映射为 3D 地面纹理，支持实时更新
- **机器人模型** — 包含底盘、轮毂、旋转激光雷达（持续动画）、超声波传感器、LED 指示灯、前保险杠等细节；车头朝向用 LED 颜色区分：**绿色 LED = 车头**（与雷达扫描方向一致），红色 LED = 车尾
- **多机器人** — 最多支持 6 台机器人同时显示，每台带颜色编码，可切换激活的机器人
- **小地图** — 右上角 2D 俯视小地图，显示地图、机器人位置/朝向、路径、视口矩形、航点
- **面包屑轨迹** — 机器人运动路径的橙色轨迹线（最多 2000 采样点）
- **膨胀层覆盖** — 切换显示机器人膨胀层（红色=占用，橙色=膨胀范围）
- **3D 标签** — 双击地图添加文本标签（圆形底标 + 圆角矩形精灵）
- **相机预设** — 俯视/侧视/45° 视角一键切换，平滑动画过渡
- **跟随机器人** — 相机自动跟随激活机器人

### 操作模式

| 模式 | 说明 | ROS 模式 | Mock 模式 |
|------|------|----------|-----------|
| **Navigate** | 点击添加航点，机器人依次导航 | 发布导航目标 | A* 寻路模拟 |
| **HRZ Zone** | 绘制多边形限制区域 | 发布至 /hrz_zones | 写入模拟 costmap |
| **HRP Path** | 绘制参考路径，按段标注速度 | 发布至 /hrp_path | 模拟路径跟随 |
| **Map Edit** | 绘制/擦除/矩形填充障碍物 | — | 修改模拟地图 |

### HRZ 禁区编辑器

- 点击放置顶点，靠近首点自动闭合多边形
- 三种禁区等级：**禁止**（红色）、**慢速**（黄色）、**充电**（绿色）
- 拖拽顶点调整多边形形状
- 区域类型可随时切换
- 撤销/重做（Ctrl+Z / Ctrl+Y，最多保存 50 步）
- 按住 Shift 吸附到 0.5m 网格

### HRP 路径编辑器

- 点击拖拽绘制自由路径
- **分段速度控制** — 每段可独立设置 13 档速度（0.05~2.0 m/s），颜色渐变标注（黄→绿）
- **自动匹配速度** — 根据路径与 HRZ 区域的重叠自动设置各段速度
- 右键插入中间点
- 拖拽路径顶点微调
- **路径可达性检查** — 基于 Bresenham 线碰撞检测，阻塞段显示红色虚线动画
- 预估通行时间与总距离

### 导航

- 单目标点导航（点击地图设定目标）
- **多航点导航** — 依次添加多个途经点（编号标记），机器人按顺序执行
- 3D 航点标记：编号精灵 + 环状标记 + 连接虚线
- 当前执行航点高亮（粉色）
- 实时订阅 move_base 规划路径（`/move_base/NavfnROS/plan`），白色虚线叠加显示

### ROS 集成

- WebSocket 连接 rosbridge（默认 ws://localhost:9090）
- 订阅：`/map`（占用栅格）、`/odom`（里程计含位姿/速度）、`/move_base/NavfnROS/plan`（规划路径）
- 发布：`/move_base_simple/goal`、`/cmd_vel`、`/waypoint_goals`、`/hrz_zones`、`/hrp_path`、`/hrp_speeds`
- 提供 ROS 1 桥接节点（catkin 包）：hrz_costmap_node（禁区→costmap）、hrp_planner_node（参考路径→全局规划）

### Mock 离线模式

- 不依赖 ROS，浏览器内完整模拟
- 生成带障碍物的默认地图或空白地图
- A* 寻路（8 方向，膨胀层碰撞检测 + 视线平滑）
- 机器人运动模拟（差速驱动机器人）
- 航点导航、HRZ 区域写入 costmap、HRP 路径跟随（遇障自动绕行）
- 地图编辑：笔刷（墙/擦除）、矩形填充、放置机器人
- 事件日志面板

### 远程遥控

- WASD 键盘遥控（W 前进、S 后退、A 左转、D 右转）
- 线性 0.3 m/s，角速度 0.8 rad/s
- ROS 模式发布 cmd_vel，Mock 模式更新模拟位姿
- 状态栏一键开关

### 编队管理

- 编队类型：**线形**、**纵列**、**V 形**、**圆形**
- 可调间距（0.3~2.0 m）
- 添加/移除机器人，选择激活

### 位姿同步

- 独立 WebSocket 服务器（默认 ws://localhost:9091）
- 多机器人位姿数据收发（100 ms 间隔）
- 可在侧边栏启停

### 场景快照

- 保存/加载命名快照（包含：HRZ 区域 + HRP 路径 + 速度数据 + 3D 标签 + 相机位置）
- 不同场景一键切换
- localStorage 持久化

### 持久化

- HRZ 区域、HRP 路径、3D 标签自动保存至 localStorage
- 页面加载时自动恢复

### 无障碍

- 多语言：简体中文 / English / 日本語
- 高对比度模式
- ARIA 标签
- 键盘快捷键

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 预览构建产物
npm run preview
```

开发服务器默认运行在 `http://localhost:3000`。

## 目录结构

```
WebRop/
├── src/
│   ├── components/
│   │   ├── editor/          # HRZPolygon、HRZEditor3D、HRPEditor3D
│   │   ├── layout/          # Sidebar、StatusBar
│   │   ├── ros/             # ROSConnection
│   │   ├── scene/           # Scene3D、RobotModel、MapFloor、CameraControls、MiniMap、NavPathVisual、InflationOverlay、MapLabels3D、MapEditPreview、BreadcrumbTrail
│   │   └── ui/              # ModeSelector、ActionPanel、SnapshotPanel、ToastOverlay
│   ├── stores/              # Zustand stores（17 个）
│   ├── ros/                 # connection、mock、types
│   ├── utils/               # coordinate、mapRenderer、pathCheck、persistence
│   └── i18n/                # 多语言翻译
├── ros1_bridge/             # ROS 1 catkin 包
│   ├── launch/              # web_bridge.launch
│   └── scripts/             # hrz_costmap_node.py、hrp_planner_node.py
└── docs/                    # 论文、设计文档、开发记录
```

## 参考文献

本项目的核心功能复现自以下两篇学术论文（原文基于 HoloLens + Unity 实现，本项目改为 Web 浏览器实现）：

- Kosaka, A., et al., "[MRHaD: Mixed Reality-based Hand-drawn Restricted Zone Editing Interface for Mobile Robot Navigation](https://arxiv.org/abs/2504.00580)", arXiv:2504.00580, 2025.
- Kosaka, A., et al., "[MRReP: Mixed Reality-based Hand-drawn Reference Path Editing Interface for Mobile Robot Navigation](https://arxiv.org/abs/2604.00059)", arXiv:2604.00059, 2025.

如需引用，请使用上述 arXiv 编号。

