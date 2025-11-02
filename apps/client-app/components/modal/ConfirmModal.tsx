import styles from './ConfirmModal.module.scss';
import React, { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  confirmDisabled = false,
  children,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element to restore later
    const previousActive = document.activeElement as HTMLElement | null;

    // If no custom children are provided, focus the confirm button by default.
    // If children are provided (for example an input), let those elements manage focus
    if (!children) {
      setTimeout(() => {
        confirmRef.current?.focus();
      }, 0);
    }

    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }

      if (e.key === 'Tab' && modalRef.current) {
        // Simple focus trap
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('disabled'));

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!first || !last) return;

        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      // restore focus
      previousActive?.focus();
    };
  }, [isOpen, onCancel, children]);

    if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onCancel}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h3 id="confirm-modal-title" className={styles.title}>{title}</h3>
        </div>
        <div className={styles.body}>
          {children ? children : <p className={styles.message}>{message}</p>}
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            className={`${styles.confirmButton} ${danger ? styles.confirmButtonDanger : ''}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
