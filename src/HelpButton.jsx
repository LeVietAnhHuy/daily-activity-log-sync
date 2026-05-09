import { useEffect, useId, useRef, useState } from "react";

export default function HelpButton({ title, body, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span className="help-popover-wrap" ref={wrapperRef}>
      <button
        type="button"
        className="help-button"
        aria-label={ariaLabel || `Explain ${title}`}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        title={ariaLabel || `Explain ${title}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        ?
      </button>
      {isOpen && (
        <span className="help-popover" id={popoverId} role="dialog" aria-label={title}>
          <strong>{title}</strong>
          <span>{body}</span>
        </span>
      )}
    </span>
  );
}
