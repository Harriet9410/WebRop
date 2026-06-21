export interface RosMsg_OccupancyGrid {
  header: { frame_id: string };
  info: {
    resolution: number;
    width: number;
    height: number;
    origin: { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number } };
  };
  data: number[];
}

export interface RosMsg_Odometry {
  header: { frame_id: string };
  child_frame_id: string;
  pose: {
    pose: {
      position: { x: number; y: number; z: number };
      orientation: { x: number; y: number; z: number; w: number };
    };
  };
  twist: {
    twist: {
      linear: { x: number; y: number; z: number };
      angular: { x: number; y: number; z: number };
    };
  };
}

export interface RosMsg_Path {
  header: { frame_id: string };
  poses: { pose: { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number } } }[];
}

export interface RosMsg_String {
  data: string;
}

export interface RosMsg_LaserScan {
  header: { frame_id: string; stamp: { secs: number; nsecs: number } };
  angle_min: number;
  angle_max: number;
  angle_increment: number;
  time_increment: number;
  scan_time: number;
  range_min: number;
  range_max: number;
  ranges: number[];
  intensities: number[];
}

export interface RosMsg_CompressedImage {
  header: { frame_id: string; stamp: { secs: number; nsecs: number } };
  format: string;
  data: string;
}
