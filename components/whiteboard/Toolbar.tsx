'use client';

import { Pencil, Eraser, MousePointer2, Square, Circle, Trash2 } from 'lucide-react';
import { CanvasTool } from '@/lib/peer/protocol';
import { useWhiteboardStore } from '@/store/whiteboardStore';

interface ToolbarProps {
  onClear: () => void;
}

const TOOLS: { tool: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { tool: CanvasTool.PEN, icon: <Pencil size={18} />, label: 'Pen' },
  { tool: CanvasTool.ERASER, icon: <Eraser size={18} />, label: 'Eraser' },
  { tool: CanvasTool.SELECT, icon: <MousePointer2 size={18} />, label: 'Select' },
  { tool: CanvasTool.RECTANGLE, icon: <Square size={18} />, label: 'Rectangle' },
  { tool: CanvasTool.CIRCLE, icon: <Circle size={18} />, label: 'Circle' },
];

const STROKE_WIDTHS = [2, 4, 8, 14];

export default function Toolbar({ onClear }: ToolbarProps) {
  const { selectedTool, selectedColor, strokeWidth, setTool, setColor, setStrokeWidth } =
    useWhiteboardStore();

  return (
    <div className="flex flex-col gap-3 bg-white border border-gray-200 rounded-xl shadow-md p-3 w-14 select-none">
      {/* Tool buttons */}
      {TOOLS.map(({ tool, icon, label }) => (
        <button
          key={tool}
          title={label}
          onClick={() => setTool(tool)}
          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
            selectedTool === tool
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {icon}
        </button>
      ))}

      <div className="border-t border-gray-200 my-1" />

      {/* Color picker */}
      <label title="Color" className="flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer hover:bg-gray-100">
        <div
          className="w-6 h-6 rounded-full border-2 border-gray-300"
          style={{ background: selectedColor }}
        />
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => setColor(e.target.value)}
          className="sr-only"
        />
      </label>

      <div className="border-t border-gray-200 my-1" />

      {/* Stroke widths */}
      {STROKE_WIDTHS.map((w) => (
        <button
          key={w}
          title={`Stroke ${w}px`}
          onClick={() => setStrokeWidth(w)}
          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
            strokeWidth === w ? 'bg-indigo-100' : 'hover:bg-gray-100'
          }`}
        >
          <div
            className="rounded-full bg-gray-800"
            style={{ width: Math.min(w * 2, 24), height: Math.min(w * 2, 24) }}
          />
        </button>
      ))}

      <div className="border-t border-gray-200 my-1" />

      {/* Clear */}
      <button
        title="Clear canvas"
        onClick={onClear}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
