'use client';

import { useEffect, useState } from 'react';
import { Brain, Cpu, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { FabricObject } from 'fabric';
import {
  analyzeSelectedObject,
  initTF,
  getTFStatus,
  type AIAnalysisResult,
  type TFStatus,
} from '@/lib/canvas/aiBridge';

interface AIPanelProps {
  selectedObject: FabricObject | null;
}

export default function AIPanel({ selectedObject }: AIPanelProps) {
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [tfStatus, setTfStatus] = useState<TFStatus | null>(null);

  // Initialize TF.js once on mount (client-side only via useEffect)
  useEffect(() => {
    initTF().then(() => setTfStatus(getTFStatus()));
  }, []);

  // Reset result when selected object changes
  useEffect(() => {
    setResult(null);
  }, [selectedObject]);

  const handleAnalyze = () => {
    if (!selectedObject) return;
    setResult(analyzeSelectedObject(selectedObject));
  };

  const bb = selectedObject?.getBoundingRect?.();

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-4 w-64 select-none">

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
        <Brain size={16} className="text-indigo-500" />
        AI Shape Recognition
      </div>

      {/* TF.js status row */}
      <div className="flex items-center gap-1.5 mb-1 text-xs">
        <Cpu size={12} className="text-gray-400 shrink-0" />
        {tfStatus === null ? (
          <span className="text-gray-400">Initializing TensorFlow.js…</span>
        ) : tfStatus.tfReady ? (
          <span className="text-green-600 font-medium">TensorFlow.js connected</span>
        ) : (
          <span className="text-red-500">TensorFlow.js unavailable</span>
        )}
      </div>

      {/* Model status row */}
      <div className="flex items-start gap-1.5 mb-3 text-xs">
        {tfStatus?.modelLoaded ? (
          <CheckCircle2 size={12} className="text-green-500 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
        )}
        <span className="text-gray-500 leading-snug">
          {tfStatus?.statusMessage ?? '…'}
        </span>
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!selectedObject}
        className="w-full py-2 px-3 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-3"
      >
        AI Recognize Shape
      </button>

      {/* Selected object info */}
      {selectedObject ? (
        <div className="space-y-1 text-xs text-gray-600 mb-3 bg-gray-50 rounded-lg p-2">
          <div>
            <span className="text-gray-400">ID: </span>
            <span className="font-mono break-all">{selectedObject.id ?? 'unassigned'}</span>
          </div>
          <div>
            <span className="text-gray-400">Type: </span>
            <span>{selectedObject.type ?? 'unknown'}</span>
          </div>
          {bb && (
            <div>
              <span className="text-gray-400">Bounding box: </span>
              <span>
                x:{Math.round(bb.left)} y:{Math.round(bb.top)}{' '}
                — {Math.round(bb.width)}×{Math.round(bb.height)}px
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-3 italic">
          Select an object on the canvas to analyze it.
        </p>
      )}

      {/* Result section */}
      {result && (
        <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">

          {/* Recognition mode badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Mode:</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-indigo-700 bg-indigo-50 font-medium capitalize">
              {result.recognitionMode}
            </span>
          </div>

          {/* Predicted shape */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Predicted shape</span>
            <span className="font-semibold text-indigo-700 capitalize">
              {result.predictedShape}
            </span>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400">Confidence</span>
              <span
                className={`font-medium ${
                  result.confidence >= 80
                    ? 'text-green-600'
                    : result.confidence >= 50
                    ? 'text-amber-600'
                    : 'text-red-500'
                }`}
              >
                {result.confidence}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  result.confidence >= 80
                    ? 'bg-green-500'
                    : result.confidence >= 50
                    ? 'bg-amber-400'
                    : 'bg-red-400'
                }`}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>

          {/* Explanation */}
          <p className="text-gray-500 leading-snug">{result.message}</p>
        </div>
      )}
    </div>
  );
}
