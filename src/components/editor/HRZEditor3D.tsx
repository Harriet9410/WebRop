import { useHRZStore } from '../../stores/hrzStore';
import { HRZPolygon } from './HRZPolygon';

export function HRZEditor3D() {
  const zones = useHRZStore((s) => s.zones);
  const currentVertices = useHRZStore((s) => s.currentVertices);

  return (
    <group>
      {zones.map((zone) => (
        <HRZPolygon key={zone.id} zoneId={zone.id} vertices={zone.vertices} closed={true} />
      ))}
      {currentVertices.length > 0 && (
        <HRZPolygon
          vertices={currentVertices}
          color="#ff9800"
          opacity={0.2}
          closed={false}
        />
      )}
    </group>
  );
}
