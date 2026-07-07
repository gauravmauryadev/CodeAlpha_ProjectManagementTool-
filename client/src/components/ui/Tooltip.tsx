"use client";

import React, { useState } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export default function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [active, setActive] = useState(false);

  let positionClasses = "";
  switch (position) {
    case "top":
      positionClasses = "bottom-full left-1/2 -translate-x-1/2 mb-2.5";
      break;
    case "bottom":
      positionClasses = "top-full left-1/2 -translate-x-1/2 mt-2.5";
      break;
    case "left":
      positionClasses = "right-full top-1/2 -translate-y-1/2 mr-2.5";
      break;
    case "right":
      positionClasses = "left-full top-1/2 -translate-y-1/2 ml-2.5";
      break;
  }

  return (
    <div
      className="relative inline-flex items-center justify-center"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      {children}
      {active && (
        <div
          className={`absolute ${positionClasses} z-[9999] px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white/80 backdrop-blur-xl border border-white/80 rounded-lg shadow-sm pointer-events-none transition-all duration-200 ease-out whitespace-nowrap`}
          style={{
            animation: "tooltip-fade 0.15s ease-out forwards",
          }}
        >
          {content}
          {/* Subtle bottom arrow */}
          <div
            className={`absolute w-1.5 h-1.5 bg-white/80 border-r border-b border-white/80 transform rotate-45 ${
              position === "top"
                ? "left-1/2 -translate-x-1/2 top-full -mt-[4px]"
                : position === "bottom"
                ? "left-1/2 -translate-x-1/2 bottom-full -mb-[4px] rotate-[225deg]"
                : position === "left"
                ? "top-1/2 -translate-y-1/2 left-full -ml-[4px] rotate-[-45deg]"
                : "top-1/2 -translate-y-1/2 right-full -mr-[4px] rotate-[135deg]"
            }`}
          />
        </div>
      )}
    </div>
  );
}
