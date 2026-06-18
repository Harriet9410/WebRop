import type { ThreeElements, Object3DNode } from '@react-three/fiber';
import type { Line } from 'three';

type LineProps = Object3DNode<Line, typeof Line>;

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      line: LineProps;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      line: LineProps;
    }
  }
}
