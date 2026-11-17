import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface CustomSelectProps {
  id?: string;
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}

export default function CustomSelect({
  id,
  label,
  value,
  options,
  placeholder = 'Choose an option',
  error,
  onChange,
}: CustomSelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const labelId = `${fieldId}-label`;
  const listId = `${fieldId}-list`;
  const errorId = `${fieldId}-error`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value)));

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  function choose(option: string) {
    onChange(option);
    setActiveIndex(options.indexOf(option));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.indexOf(value)));
      setOpen(true);
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div className={`custom-select${error ? ' has-error' : ''}${open ? ' is-open' : ''}`} ref={rootRef}>
      <span className="custom-select-label" id={labelId}>{label}</span>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={value ? '' : 'is-placeholder'}>{value || placeholder}</span>
        <FiChevronDown aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="custom-select-list"
          role="listbox"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-activedescendant={options[activeIndex] ? `${fieldId}-option-${activeIndex}` : undefined}
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option}
              id={`${fieldId}-option-${index}`}
              className={index === activeIndex ? 'is-highlighted' : ''}
              role="option"
              aria-selected={value === option}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
      {error && <span className="custom-select-error" id={errorId} role="alert">{error}</span>}
    </div>
  );
}
