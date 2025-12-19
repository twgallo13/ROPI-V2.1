/**
 * AIAnalyzeChips Component
 * 
 * LP-1.1.1: Display AI-suggested observation text as selectable chips.
 */

import { useState, useCallback } from 'react';
import './AIAnalyzeChips.css';

export interface AISuggestion {
  text: string;
  confidence: number;
}

interface AIAnalyzeChipsProps {
  imageUrls: string[];
  onSuggestionSelect: (text: string) => void;
  disabled?: boolean;
  apiBaseUrl?: string;
}

export default function AIAnalyzeChips({
  imageUrls,
  onSuggestionSelect,
  disabled = false,
  apiBaseUrl = '/api',
}: AIAnalyzeChipsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Call AI analyze endpoint
  const analyzeImages = useCallback(async () => {
    if (imageUrls.length === 0) {
      setError('No images to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSuggestions([]);

    try {
      // Use the first image for analysis (MVP scope)
      // In the future, this could analyze multiple images
      const response = await fetch(`${apiBaseUrl}/observations/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imageUrl: imageUrls[0],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        setHasAnalyzed(true);
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageUrls, apiBaseUrl]);

  // Handle chip selection
  const handleChipClick = useCallback((suggestion: AISuggestion) => {
    onSuggestionSelect(suggestion.text);
  }, [onSuggestionSelect]);

  const canAnalyze = imageUrls.length > 0 && !disabled && !isAnalyzing;

  return (
    <div className="ai-analyze-chips">
      {/* Analyze button */}
      {!hasAnalyzed && (
        <button
          className="analyze-images-btn"
          onClick={analyzeImages}
          disabled={!canAnalyze}
        >
          {isAnalyzing ? (
            <>
              <span className="analyze-spinner" />
              Analyzing...
            </>
          ) : (
            <>
              <span className="analyze-icon">🔍</span>
              Analyze Images with AI
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="ai-error">
          {error}
          <button className="retry-analyze-btn" onClick={analyzeImages}>
            Retry
          </button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="suggestions-container">
          <div className="suggestions-header">
            <span className="suggestions-title">AI Suggestions</span>
            <button
              className="re-analyze-btn"
              onClick={analyzeImages}
              disabled={isAnalyzing}
            >
              ↻ Re-analyze
            </button>
          </div>
          
          <div className="suggestion-chips">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-chip"
                onClick={() => handleChipClick(suggestion)}
                disabled={disabled}
              >
                <span className="chip-text">{suggestion.text}</span>
                {suggestion.confidence >= 0.8 && (
                  <span className="chip-badge high">High</span>
                )}
                {suggestion.confidence >= 0.5 && suggestion.confidence < 0.8 && (
                  <span className="chip-badge medium">Med</span>
                )}
                {suggestion.confidence < 0.5 && (
                  <span className="chip-badge low">Low</span>
                )}
              </button>
            ))}
          </div>
          
          <p className="suggestions-hint">
            Tap a suggestion to add it to your observation
          </p>
        </div>
      )}

      {/* No suggestions after analysis */}
      {hasAnalyzed && suggestions.length === 0 && !error && !isAnalyzing && (
        <div className="no-suggestions">
          <span className="no-suggestions-icon">🤷</span>
          <p>No suggestions available for this image.</p>
          <button className="retry-analyze-btn" onClick={analyzeImages}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
