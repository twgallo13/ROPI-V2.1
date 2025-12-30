/**
 * TagBubbles Component
 * 
 * LP-obs-studio-cleanup-1.3.0: Compact tag chips for desktop product detail editor.
 * Supports adding/removing tags with immediate API sync.
 */

import { useState, useCallback, KeyboardEvent } from 'react';
import './TagBubbles.css';

interface TagBubblesProps {
  /** Current tags */
  tags: string[];
  /** Callback when tags change */
  onTagsChange: (tags: string[]) => void;
  /** Optional: Callback for immediate tag removal API call (desktop mode) */
  onTagRemove?: (tag: string) => Promise<void>;
  /** Optional: Callback for immediate tag add API call (desktop mode) */
  onTagAdd?: (tag: string) => Promise<void>;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Size variant */
  size?: 'small' | 'medium';
}

function TagBubbles({
  tags,
  onTagsChange,
  onTagRemove,
  onTagAdd,
  maxTags = 10,
  readOnly = false,
  placeholder = 'Add tag...',
  size = 'small',
}: TagBubblesProps) {
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingTag, setRemovingTag] = useState<string | null>(null);

  const handleAddTag = useCallback(async (newTag: string) => {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) {
      return;
    }

    // Optimistic update
    const newTags = [...tags, trimmed];
    onTagsChange(newTags);
    setInputValue('');

    // Background API call if provided (desktop mode)
    if (onTagAdd) {
      try {
        setIsAdding(true);
        await onTagAdd(trimmed);
      } catch (err) {
        console.error('Failed to add tag:', err);
        // Revert on failure
        onTagsChange(tags);
      } finally {
        setIsAdding(false);
      }
    }
  }, [tags, onTagsChange, onTagAdd, maxTags]);

  const handleRemoveTag = useCallback(async (tagToRemove: string) => {
    // Optimistic update
    const newTags = tags.filter(t => t !== tagToRemove);
    onTagsChange(newTags);

    // Background API call if provided (desktop mode)
    if (onTagRemove) {
      try {
        setRemovingTag(tagToRemove);
        await onTagRemove(tagToRemove);
      } catch (err) {
        console.error('Failed to remove tag:', err);
        // Revert on failure
        onTagsChange(tags);
      } finally {
        setRemovingTag(null);
      }
    }
  }, [tags, onTagsChange, onTagRemove]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag on backspace
      const lastTag = tags[tags.length - 1];
      handleRemoveTag(lastTag);
    }
  }, [inputValue, tags, handleAddTag, handleRemoveTag]);

  return (
    <div className={`tag-bubbles ${size}`}>
      <div className="tag-bubbles-container">
        {tags.map((tag) => (
          <span 
            key={tag} 
            className={`tag-bubble ${removingTag === tag ? 'removing' : ''}`}
          >
            {tag}
            {!readOnly && (
              <button
                type="button"
                className="tag-bubble-remove"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
                disabled={removingTag === tag}
              >
                ×
              </button>
            )}
          </span>
        ))}
        
        {!readOnly && tags.length < maxTags && (
          <input
            type="text"
            className="tag-bubble-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : '+'}
            disabled={isAdding}
            aria-label="Add tag"
          />
        )}
      </div>
      
      {tags.length >= maxTags && !readOnly && (
        <span className="tag-limit-hint">Max {maxTags} tags</span>
      )}
    </div>
  );
}

export default TagBubbles;
