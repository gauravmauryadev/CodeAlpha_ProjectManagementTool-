import React from "react";
import { Rocket, Target, CheckCircle, BarChart, Lightbulb, Zap, FolderKanban, Activity } from "lucide-react";

const icons = [
  { Icon: Rocket, top: "10%", left: "15%", delay: "0s", size: 38, rotate: "12deg", color: "text-indigo-400 dark:text-indigo-500" },
  { Icon: Target, top: "25%", left: "82%", delay: "2s", size: 42, rotate: "-15deg", color: "text-blue-400 dark:text-blue-500" },
  { Icon: FolderKanban, top: "70%", left: "10%", delay: "4s", size: 44, rotate: "5deg", color: "text-sky-400 dark:text-sky-500" },
  { Icon: Lightbulb, top: "60%", left: "85%", delay: "5s", size: 36, rotate: "15deg", color: "text-blue-300 dark:text-blue-600" },
  { Icon: Zap, top: "18%", left: "50%", delay: "1.5s", size: 30, rotate: "-25deg", color: "text-sky-500 dark:text-sky-400" },
  { Icon: CheckCircle, top: "45%", left: "8%", delay: "3s", size: 32, rotate: "20deg", color: "text-indigo-300 dark:text-indigo-500" },
  { Icon: BarChart, top: "85%", left: "45%", delay: "3.5s", size: 40, rotate: "10deg", color: "text-indigo-500 dark:text-indigo-400" },
  { Icon: Activity, top: "50%", left: "70%", delay: "2.5s", size: 34, rotate: "-12deg", color: "text-slate-400 dark:text-slate-500" },
];

export default function FloatingIcons() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {icons.map((item, i) => (
        <div
          key={i}
          className="absolute opacity-40 dark:opacity-20 animate-float-sticker drop-shadow-sm"
          style={{
            top: item.top,
            left: item.left,
            animationDelay: item.delay,
            animationDuration: `${8 + (i % 4)}s`,
          }}
        >
          <item.Icon
            className={`${item.color}`}
            size={item.size}
            style={{ transform: `rotate(${item.rotate})` }}
            strokeWidth={1.5}
          />
        </div>
      ))}
    </div>
  );
}
