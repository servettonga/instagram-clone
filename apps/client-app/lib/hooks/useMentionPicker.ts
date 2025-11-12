import { useState, useRef, RefObject } from 'react';

interface UseMentionPickerReturn {
  // State
  showMentionPicker: boolean;
  mentionQuery: string;
  mentionPickerPosition: { top: number; left: number };

  // Ref for the input element
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;

  // Handlers
  handleTextChange: (value: string, cursorPosition: number) => void;
  handleMentionSelect: (username: string, currentText: string, cursorPos: number) => string;
  closeMentionPicker: () => void;

  // For checking if picker should block Enter key
  shouldBlockEnter: () => boolean;
}

export function useMentionPicker(): UseMentionPickerReturn {
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPickerPosition, setMentionPickerPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleTextChange = (value: string, cursorPosition: number) => {
    // Check if there's an '@' before cursor
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's whitespace between @ and cursor
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      if (!/\s/.test(textAfterAt)) {
        // No whitespace, show mention picker
        setMentionStartIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentionPicker(true);

        // Calculate position for mention picker
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          const pickerHeight = 200; // max-height from CSS
          const margin = 8;
          const isTextarea = inputRef.current.tagName === 'TEXTAREA';

          let top: number;
          const left = rect.left;

          if (isTextarea) {
            // For textareas, try to position near cursor
            // Create a temporary span to measure cursor position
            const textArea = inputRef.current as HTMLTextAreaElement;
            const style = window.getComputedStyle(textArea);
            const dummy = document.createElement('div');

            // Copy styles to dummy element
            dummy.style.cssText = `
              position: absolute;
              visibility: hidden;
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: ${style.fontFamily};
              font-size: ${style.fontSize};
              line-height: ${style.lineHeight};
              padding: ${style.padding};
              border: ${style.border};
              width: ${textArea.offsetWidth}px;
            `;

            // Get text up to cursor
            const textBeforeCursor = value.substring(0, cursorPosition);
            dummy.textContent = textBeforeCursor;

            // Add to DOM temporarily to measure
            document.body.appendChild(dummy);
            const dummyHeight = dummy.offsetHeight;
            document.body.removeChild(dummy);

            // Calculate cursor vertical position within textarea
            const cursorY = rect.top + dummyHeight + textArea.scrollTop;
            const spaceBelow = window.innerHeight - cursorY;

            if (spaceBelow > pickerHeight + margin) {
              // Position below cursor line
              top = cursorY + margin;
            } else {
              // Position above cursor line
              top = Math.max(margin, cursorY - pickerHeight - margin);
            }
          } else {
            // For single-line inputs, position above
            const spaceAbove = rect.top;

            if (spaceAbove > pickerHeight + margin) {
              // Position above input
              top = rect.top - pickerHeight - margin;
            } else {
              // Not enough space above, position below
              top = rect.bottom + margin;
            }
          }

          // Ensure picker doesn't go off screen
          top = Math.max(margin, Math.min(top, window.innerHeight - pickerHeight - margin));

          setMentionPickerPosition({
            top,
            left,
          });
        }
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
  };

  const handleMentionSelect = (username: string, currentText: string, cursorPos: number): string => {
    if (mentionStartIndex === -1) return currentText;

    const beforeMention = currentText.substring(0, mentionStartIndex);
    const afterCursor = currentText.substring(cursorPos);
    const newText = `${beforeMention}@${username} ${afterCursor}`;

    setShowMentionPicker(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    // Focus back on input and position cursor
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeMention.length + username.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);

    return newText;
  };

  const closeMentionPicker = () => {
    setShowMentionPicker(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  const shouldBlockEnter = () => showMentionPicker;

  return {
    showMentionPicker,
    mentionQuery,
    mentionPickerPosition,
    inputRef,
    handleTextChange,
    handleMentionSelect,
    closeMentionPicker,
    shouldBlockEnter,
  };
}
