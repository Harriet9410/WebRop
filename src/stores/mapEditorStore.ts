import { create } from 'zustand';

export type MapTool = 'wall' | 'erase' | 'rect' | 'robot' | 'relocate';

interface MapEditorState {
  tool: MapTool;
  brushSize: number;
  rectStart: { col: number; row: number } | null;
  setTool: (tool: MapTool) => void;
  setBrushSize: (size: number) => void;
  setRectStart: (pos: { col: number; row: number } | null) => void;
}

export const useMapEditorStore = create<MapEditorState>((set) => ({
  tool: 'wall',
  brushSize: 1,
  rectStart: null,
  setTool: (tool) => set({ tool }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setRectStart: (rectStart) => set({ rectStart }),
}));
