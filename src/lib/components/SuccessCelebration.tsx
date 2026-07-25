"use client";

import React, { useEffect, useState } from "react";

export function SuccessCelebration() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 30}%`,
            background: ['var(--primary)', 'var(--accent)', 'var(--warning)', '#ff6b6b', '#48dbfb'][i % 5],
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${1.5 + Math.random() * 1}s`,
          }}
        />
      ))}
    </div>
  );
}
