/**
 * Description Panel - AI-enhanced description generation with structured layout
 */

import React, { useState, useEffect } from 'react';
import { callAIDescribe, AIDescribeResult, LayoutBlocks } from '../../api/aiDescribe';

interface DescriptionPanelProps {
  productId: string;
  currentDescription?: string;
  onDescriptionUpdate: (description: string, seoData?: any) => void;
}

const DescriptionPanel: React.FC<DescriptionPanelProps> = ({
  productId,
  currentDescription,
  onDescriptionUpdate,
}) => {
  const [result, setResult] = useState<AIDescribeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'blocks' | 'html' | 'preview'>('blocks');
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());

  // Load AI description on mount and when productId changes
  useEffect(() => {
    if (productId) {
      loadDescription();
    }
  }, [productId]);

  const loadDescription = async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);
    
    try {
      const describeResult = await callAIDescribe(productId);
      setResult(describeResult);
      
      // Auto-select all blocks initially
      if (describeResult.blocks) {
        const blockIds = Object.keys(describeResult.blocks);
        setSelectedBlocks(new Set(blockIds));
      }
    } catch (err) {
      console.error('AI Describe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate description');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = (blockId: string) => {
    const newSelected = new Set(selectedBlocks);
    if (newSelected.has(blockId)) {
      newSelected.delete(blockId);
    } else {
      newSelected.add(blockId);
    }
    setSelectedBlocks(newSelected);
  };

  const handleSelectAll = () => {
    if (!result?.blocks) return;
    setSelectedBlocks(new Set(Object.keys(result.blocks)));
  };

  const handleSelectNone = () => {
    setSelectedBlocks(new Set());
  };

  const generateFinalDescription = () => {
    if (!result?.blocks) return '';
    
    const selected = Object.entries(result.blocks)
      .filter(([blockId]) => selectedBlocks.has(blockId))
      .map(([, blockHtml]) => blockHtml);
    
    return selected.join('\n\n');
  };

  const handleApplyDescription = () => {
    const description = generateFinalDescription();
    onDescriptionUpdate(description, result?.seo);
  };

  const getBlockTypeIcon = (type: string) => {
    switch (type) {
      case 'hero': return '🎯';
      case 'features': return '⚡';
      case 'techSpecs': return '📊';
      case 'fit': return '✨';
      case 'materials': return '🔧';
      case 'care': return '🧽';
      default: return '📝';
    }
  };

  const renderBlockPreview = (blockHtml: string) => {
    // Strip HTML tags for preview
    const textContent = blockHtml.replace(/<[^>]*>/g, '');
    return textContent.length > 150 ? textContent.substring(0, 150) + '...' : textContent;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">AI Description Engine</h3>
        <div className="flex gap-2">
          <button
            onClick={loadDescription}
            disabled={loading}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Regenerate'}
          </button>
          {result && (
            <button
              onClick={handleApplyDescription}
              disabled={selectedBlocks.size === 0}
              className="px-4 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Apply ({selectedBlocks.size} blocks)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Generating AI description...</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* View Mode Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setViewMode('blocks')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'blocks'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Blocks ({Object.keys(result.blocks || {}).length})
            </button>
            <button
              onClick={() => setViewMode('html')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'html'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              HTML
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'preview'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Blocks View */}
          {viewMode === 'blocks' && result.blocks && (
            <div className="space-y-4">
              {/* Block Selection Controls */}
              <div className="flex justify-between items-center py-2">
                <div className="text-sm text-gray-600">
                  Select blocks to include in final description
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    All
                  </button>
                  <button
                    onClick={handleSelectNone}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Block List */}
              <div className="space-y-3">
                {Object.entries(result.blocks).map(([blockId, blockHtml]) => {
                  const isSelected = selectedBlocks.has(blockId);
                  const htmlString = String(blockHtml || '');
                  
                  return (
                    <div
                      key={blockId}
                      className={`p-4 border rounded-md cursor-pointer transition-all ${
                        isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => handleBlockToggle(blockId)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleBlockToggle(blockId)}
                          className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getBlockTypeIcon(blockId)}</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {blockId.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {htmlString.length} chars
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 leading-relaxed">
                            {renderBlockPreview(htmlString)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HTML View */}
          {viewMode === 'html' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Selected HTML ({selectedBlocks.size} blocks)
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                  {generateFinalDescription() || 'No blocks selected'}
                </pre>
              </div>
            </div>
          )}

          {/* Preview View */}
          {viewMode === 'preview' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Rendered Preview ({selectedBlocks.size} blocks)
              </div>
              <div className="bg-white border border-gray-200 rounded-md p-4 prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: generateFinalDescription() || '<p class="text-gray-500 italic">No blocks selected</p>' }} />
              </div>
            </div>
          )}

          {/* SEO Suggestions */}
          {result.seo && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="text-sm font-semibold text-green-800 mb-2">SEO Suggestions</h4>
              <div className="space-y-2 text-sm text-green-700">
                {result.seo.meta_keywords && (
                  <div>
                    <span className="font-medium">Keywords:</span> {result.seo.meta_keywords.join(', ')}
                  </div>
                )}
                {result.seo.meta_description && (
                  <div>
                    <span className="font-medium">Meta Description:</span> {result.seo.meta_description}
                  </div>
                )}
                {result.seo.meta_title && (
                  <div>
                    <span className="font-medium">Suggested Title:</span> {result.seo.meta_title}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generation Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
            <div>Generated: {new Date().toLocaleTimeString()}</div>
            {result.summary && <div>Summary: {result.summary}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default DescriptionPanel;