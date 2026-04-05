"use client";

import { useState, useEffect } from "react";

interface ToastProps {
  show: boolean;
  message: string;
  type?: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ show, message, type = "success", onClose, duration = 2500 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setLeaving(false);
      const timer = setTimeout(() => {
        setLeaving(true);
        setTimeout(() => {
          setVisible(false);
          setLeaving(false);
          onClose();
        }, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!visible) return null;

  return (
    <div className={`toast toast-${type} ${leaving ? "toast-exit" : "toast-enter"}`}>
      <span className="toast-icon">{type === "success" ? "\u2713" : "\u2717"}</span>
      {message}
    </div>
  );
}
