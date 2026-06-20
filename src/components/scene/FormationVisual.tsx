import { useFleetStore } from '../../stores/fleetStore';

export function FormationVisual() {
  const robots = useFleetStore((s) => s.robots);
  const activeRobotId = useFleetStore((s) => s.activeRobotId);
  const formation = useFleetStore((s) => s.formation);
  const formationSpacing = useFleetStore((s) => s.formationSpacing);

  if (robots.length <= 1) return null;

  const activeBot = robots.find((r) => r.id === activeRobotId);
  if (!activeBot) return null;

  const offsets = useFleetStore.getState().getFormationOffsets();
  const positions = offsets.map((off) => ({
    x: activeBot.pose.x + off.dx,
    z: activeBot.pose.z + off.dz,
  }));

  return (
    <group>
      {positions.map((p, i) => (
        <group key={i}>
          <mesh position={[p.x, 0.01, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          </mesh>
          <mesh position={[p.x, 0.02, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.18, 24]} />
            <meshBasicMaterial color={robots[i]?.color || '#ffffff'} side={2} transparent opacity={0.5} depthWrite={false} />
          </mesh>
          {i < positions.length - 1 && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([positions[i].x, 0.02, positions[i].z, positions[i + 1].x, 0.02, positions[i + 1].z])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
            </line>
          )}
        </group>
      ))}
    </group>
  );
}
