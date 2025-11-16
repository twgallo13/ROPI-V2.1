/**
 * Validation Panel - ROPI Score and quality issues
 */

import React, { useState, useEffect } from 'react';
import { callValidator, ValidationResult, ValidationIssue } from '../../api/validator';

interface ValidationPanelProps {
  productId: string;
  onIssueClick?: (issue: ValidationIssue) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  productId,
  onIssueClick,
}) => {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load validation on mount and when productId changes
  useEffect(() => {
    if (productId) {
      loadValidation();
    }
  }, [productId]);

  const loadValidation = async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);
    
    try {
      const validationResult = await callValidator(productId);
      setResult(validationResult);
    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to validate product');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  };

  const getIssueIcon = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  const getIssueColor = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const criticalIssues = result?.issues.filter(i => i.severity === 'critical') || [];
  const warningIssues = result?.issues.filter(i => i.severity === 'warning') || [];
  const infoIssues = result?.issues.filter(i => i.severity === 'info') || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Quality Validation</h3>
        <button
          onClick={loadValidation}
          disabled={loading}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? 'Validating...' : 'Re-run'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Validating product quality...</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* ROPI Score */}
          <div className="text-center p-6 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <div className={`text-4xl font-bold ${getScoreColor(result.ropiScore)}`}>
                {result.ropiScore}
              </div>
              <div className="text-gray-400 text-lg ml-1">/100</div>
            </div>
            <div className={`text-sm font-medium ${getScoreColor(result.ropiScore)}`}>
              {getScoreLabel(result.ropiScore)}
            </div>
            <div className="text-xs text-gray-500 mt-1">ROPI Quality Score</div>
            
            {/* Progress bar */}
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  result.ropiScore >= 90 ? 'bg-green-500' :
                  result.ropiScore >= 80 ? 'bg-blue-500' :
                  result.ropiScore >= 70 ? 'bg-yellow-500' :
                  result.ropiScore >= 60 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.ropiScore}%` }}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-700">{result.summary}</p>
          </div>

          {/* Issues by Severity */}
          {result.issues.length > 0 ? (
            <div className="space-y-4">
              {/* Critical Issues */}
              {criticalIssues.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-2">
                    Critical Issues ({criticalIssues.length})
                  </h4>
                  <div className="space-y-2">
                    {criticalIssues.map((issue, index) => (
                      <div
                        key={`critical-${index}`}
                        className={`p-3 border rounded-md cursor-pointer hover:shadow-sm ${getIssueColor(issue.severity)}`}
                        onClick={() => onIssueClick?.(issue)}
                      >
                          <div className="flex items-start gap-2">
                          <span className="text-sm">{getIssueIcon(issue.severity)}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{issue.fieldPath || issue.code}</div>
                            <div className="text-xs text-gray-600 mt-1">{issue.message}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Issues */}
              {warningIssues.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-700 mb-2">
                    Warnings ({warningIssues.length})
                  </h4>
                  <div className="space-y-2">
                    {warningIssues.map((issue, index) => (
                      <div
                        key={`warning-${index}`}
                        className={`p-3 border rounded-md cursor-pointer hover:shadow-sm ${getIssueColor(issue.severity)}`}
                        onClick={() => onIssueClick?.(issue)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm">{getIssueIcon(issue.severity)}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{issue.fieldPath || issue.code}</div>
                            <div className="text-xs text-gray-600 mt-1">{issue.message}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Issues */}
              {infoIssues.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">
                    Suggestions ({infoIssues.length})
                  </h4>
                  <div className="space-y-2">
                    {infoIssues.map((issue, index) => (
                      <div
                        key={`info-${index}`}
                        className={`p-3 border rounded-md cursor-pointer hover:shadow-sm ${getIssueColor(issue.severity)}`}
                        onClick={() => onIssueClick?.(issue)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm">{getIssueIcon(issue.severity)}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{issue.fieldPath || issue.code}</div>
                            <div className="text-xs text-gray-600 mt-1">{issue.message}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-green-600">
              <div className="text-2xl mb-2">✅</div>
              <p className="font-medium">Perfect Quality!</p>
              <p className="text-sm text-gray-500 mt-1">No issues found with this product.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;