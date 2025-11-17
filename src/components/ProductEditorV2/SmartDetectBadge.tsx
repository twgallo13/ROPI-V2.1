/**
 * SmartDetectBadge - Field-level indicator for applied Smart Detect suggestions
 * 
 * Displays a chip next to fields with applied Smart Detect metadata
 * Shows ruleName, confidence, and provides undo functionality
 */

import React, { useState } from 'react';

interface SmartDetectMetadata {
  value: unknown;
  ruleId: string;
  ruleName: string;
  confidence: number;
  autoApply: boolean;
  appliedAt: string;
  appliedBy: string;
  source: {
    type: string;
    field: string;
    raw: string;
  };
  previousValue: unknown;
}

interface SmartDetectBadgeProps {
  fieldPath: string;
  metadata: SmartDetectMetadata;
  onUndo?: () => void;
  onShowDetails?: () => void;
}

const SmartDetectBadge: React.FC<SmartDetectBadgeProps> = ({
  metadata,
  onUndo,
  onShowDetails,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const chipColor = metadata.autoApply 
    ? 'bg-blue-100 text-blue-700 border-blue-300' 
    : 'bg-yellow-100 text-yellow-700 border-yellow-300';

  const confidencePercent = Math.round(metadata.confidence * 100);

  return (
    <div className="relative inline-block ml-2">
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${chipColor} cursor-pointer`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={onShowDetails}
      >
        <span className="font-medium">SmartDetect</span>
        <span>•</span>
        <span>{metadata.ruleName}</span>
        <span>•</span>
        <span>{confidencePercent}%</span>
      </div>

      {showTooltip && (
        <div className="absolute z-50 left-0 top-full mt-1 w-80 p-3 bg-white border border-gray-300 rounded-lg shadow-lg text-sm">
          <div className="space-y-2">
            <div>
              <span className="font-semibold text-gray-700">Rule:</span>
              <span className="ml-2 text-gray-900">{metadata.ruleName}</span>
            </div>
            
            <div>
              <span className="font-semibold text-gray-700">Confidence:</span>
              <span className="ml-2 text-gray-900">{confidencePercent}%</span>
            </div>

            <div>
              <span className="font-semibold text-gray-700">Applied:</span>
              <span className="ml-2 text-gray-900">
                {new Date(metadata.appliedAt).toLocaleString()}
              </span>
            </div>

            <div>
              <span className="font-semibold text-gray-700">Applied By:</span>
              <span className="ml-2 text-gray-900">{metadata.appliedBy}</span>
            </div>

            {metadata.source && metadata.source.field && (
              <div>
                <span className="font-semibold text-gray-700">Source:</span>
                <span className="ml-2 text-gray-900">{metadata.source.field}</span>
                {metadata.source.raw && (
                  <div className="mt-1 text-xs text-gray-600 font-mono bg-gray-50 p-1 rounded max-h-20 overflow-auto">
                    {metadata.source.raw}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex gap-2">
              {onUndo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                    onUndo();
                  }}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Undo
                </button>
              )}
              
              {onShowDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                    onShowDetails();
                  }}
                  className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartDetectBadge;
