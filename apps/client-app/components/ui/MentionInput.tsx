'use client';

import { useMentionPicker } from '@/lib/hooks/useMentionPicker';
import MentionPicker from './MentionPicker';
import { forwardRef, useImperativeHandle } from 'react';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  multiline?: boolean;
  rows?: number;
  autoFocus?: boolean;
}

export interface MentionInputRef {
  focus: () => void;
  blur: () => void;
}

const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      placeholder,
      disabled,
      className,
      multiline = false,
      rows = 3,
      autoFocus,
    },
    ref
  ) => {
    const {
      showMentionPicker,
      mentionQuery,
      mentionPickerPosition,
      inputRef,
      handleTextChange,
      handleMentionSelect,
      closeMentionPicker,
      shouldBlockEnter,
    } = useMentionPicker();

    // Expose focus/blur methods to parent component
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart || 0;

      onChange(newValue);
      handleTextChange(newValue, cursorPosition);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Block Enter if mention picker is open and it's not multiline
      if (e.key === 'Enter' && !multiline && shouldBlockEnter()) {
        e.preventDefault();
        return;
      }

      onKeyDown?.(e);
    };

    const handleSelect = (username: string) => {
      const cursorPos = inputRef.current?.selectionStart || value.length;
      const newText = handleMentionSelect(username, value, cursorPos);
      onChange(newText);
    };

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            autoFocus={autoFocus}
            rows={rows}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            autoFocus={autoFocus}
          />
        )}

        {showMentionPicker && (
          <MentionPicker
            searchQuery={mentionQuery}
            position={mentionPickerPosition}
            onSelect={handleSelect}
            onClose={closeMentionPicker}
          />
        )}
      </div>
    );
  }
);

MentionInput.displayName = 'MentionInput';

export default MentionInput;
