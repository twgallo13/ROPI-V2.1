/**
 * TagsEditor Component
 * 
 * LP-observations-consolidation-1.2.0: Reusable tags-first editor for observations.
 * Used in AI tab and Desktop product page inline modals.
 * 
 * Features:
 * - Add/remove tags with keyboard shortcuts (Enter/comma to add, Backspace to remove)
 * - AI suggestion chips for quick tag addition
 * - Image upload support (optional)
 * - Canonical tag payload output
 * 
 * References:
 * - LP-observations-consolidation-1.2.0: AI tab & Desktop inline tags-first UX
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import './TagsEditor.css';

export interface TagsEditorProps {
  /** Initial tags to display */
  initialTags?: string[];
  /** Initial image URLs */
  initialImages?: string[];
  /** Suggested tags from AI analysis */
  suggestedTags?: string[];
  /** Enable image upload */
  enableImages?: boolean;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Callback when tags change */
  onTagsChange?: (tags: string[]) => void;
  /** Callback when images change */
  onImagesChange?: (images: string[]) => void;
  /** Whether editor is disabled */
  disabled?: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Auto-focus input on mount */
  autoFocus?: boolean;
}

export interface TagsEditorPayload {
  tags: string[];
  images: string[];
}

/**
 * TagsEditor - Reusable tags-first editor component
 */
function TagsEditor({
  initialTags = [],
  initialImages = [],
  suggestedTags = [],
  enableImages = true,
  maxTags = 20,
  maxImages = 5,
  onTagsChange,
  onImagesChange,
  disabled = false,
  placeholder = 'e.g., hidden pocket, runs small',
  autoFocus = false,
}: TagsEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>(initialImages);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Sync initial tags when they change externally
  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  // Sync initial images when they change externally
  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  // Notify parent of tag changes
  useEffect(() => {
    onTagsChange?.(tags);
  }, [tags, onTagsChange]);

  // Notify parent of image changes
  useEffect(() => {
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  // Add a tag (normalized to lowercase, trimmed)
  const addTag = useCallback((tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (!normalizedTag) return;
    if (tags.includes(normalizedTag)) return;
    if (tags.length >= maxTags) return;
    
    setTags(prev => [...prev, normalizedTag]);
  }, [tags, maxTags]);

  // Remove a tag
  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      // Remove last tag when backspace on empty input
      setTags(prev => prev.slice(0, -1));
    }
  }, [tagInput, tags.length, addTag]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    addTag(suggestion);
  }, [addTag]);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (images.length >= maxImages) return;

    // Limit to remaining slots
    const availableSlots = maxImages - images.length;
    const filesToProcess = files.slice(0, availableSlots);

    // Convert to data URLs
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => {
          if (prev.length >= maxImages) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  }, [images.length, maxImages]);

  // Remove an image
  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Filter suggestions to exclude already-added tags
  const availableSuggestions = suggestedTags.filter(s => !tags.includes(s.toLowerCase()));

  return (
    <div className={`tags-editor ${disabled ? 'tags-editor-disabled' : ''}`}>
      {/* Tags Input Container */}
      <div className="tags-editor-input-container">
        {tags.map((tag) => (
          <span key={tag} className="tags-editor-chip">
            {tag}
            {!disabled && (
              <button
                type="button"
                className="tags-editor-chip-remove"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="tags-editor-input"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : 'Add another tag...'}
          disabled={disabled || tags.length >= maxTags}
          aria-label="Add tag"
        />
      </div>

      {/* Help Text */}
      <p className="tags-editor-help">
        Press Enter or comma to add a tag. Backspace removes last tag.
        {tags.length >= maxTags && <span className="tags-editor-limit"> (max {maxTags} tags)</span>}
      </p>

      {/* AI Suggestions */}
      {availableSuggestions.length > 0 && !disabled && (
        <div className="tags-editor-suggestions">
          <span className="tags-editor-suggestions-label">💡 Suggested:</span>
          <div className="tags-editor-suggestions-list">
            {availableSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="tags-editor-suggestion-chip"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload Section */}
      {enableImages && (
        <div className="tags-editor-images">
          {images.length > 0 && (
            <div className="tags-editor-image-previews">
              {images.map((img, idx) => (
                <div key={idx} className="tags-editor-image-preview">
                  <img src={img} alt={`Upload ${idx + 1}`} />
                  {!disabled && (
                    <button
                      type="button"
                      className="tags-editor-image-remove"
                      onClick={() => removeImage(idx)}
                      aria-label={`Remove image ${idx + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!disabled && images.length < maxImages && (
            <label className="tags-editor-upload-button">
              📷 {images.length > 0 ? 'Add More' : 'Add Images'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
          {images.length > 0 && (
            <span className="tags-editor-image-count">
              {images.length}/{maxImages} images
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Get the canonical payload from TagsEditor state
 * Useful for form submission
 */
export function getTagsEditorPayload(tags: string[], images: string[]): TagsEditorPayload {
  return {
    tags: tags.map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
    images: images.filter(img => img.length > 0),
  };
}

export default TagsEditor;
