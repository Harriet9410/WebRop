import { useMemo } from 'react';
import { useHRZStore, ZONE_COLORS } from '../../stores/hrzStore';
import { HRZPolygon } from './HRZPolygon';

export function HRZEditor3D() {
  const zones = useHRZStore((s) => s.zones);
  const currentVertices = useHRZStore((s) => s.currentVertices);

  const guideLinePositions = useMemo(() => {
    if (currentVertices.length < 2) return null;
    const last = currentVertices[currentVertices.length - 1];
    const first = currentVertices[0];
    return new Float32Array([last.x, 0.025, last.z, first.x, 0.025, first.z]);
  }, [currentVertices]);

  return (
    <group>
      {zones.map((zone) => (
        <HRZPolygon
          key={zone.id}
          zoneId={zone.id}
          zoneType={zone.zoneType}
          name={zone.name}
          vertices={zone.vertices}
          color={ZONE_COLORS[zone.zoneType]}
          closed={true}
        />
      ))}
      {currentVertices.length > 0 && (
        <HRZPolygon
          vertices={currentVertices}
          color="#ff9800"
          opacity={0.2}
          closed={false}
        />
      )}
      {guideLinePositions && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={guideLinePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff9800" transparent opacity={0.35} depthWrite={false} />
        </line>
      )}
    </group>
  );
}
