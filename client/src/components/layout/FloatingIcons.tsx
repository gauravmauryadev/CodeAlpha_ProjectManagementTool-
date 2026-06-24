import React from "react";
import { Rocket, Target, Briefcase, Clock, Calendar, CheckCircle, BarChart, Lightbulb, Zap, Coffee, FolderKanban, Activity } from "lucide-react";

const icons = [
  { Icon: Rocket, top: "15%", left: "15%", delay: "0s", size: 48, rotate: "12deg", color: "text-indigo-400 dark:text-indigo-500" },
  { Icon: Target, top: "25%", left: "82%", delay: "2s", size: 56, rotate: "-15deg", color: "text-blue-400 dark:text-blue-500" },
  { Icon: FolderKanban, top: "75%", left: "12%", delay: "4s", size: 64, rotate: "5deg", color: "text-sky-400 dark:text-sky-500" },
  { Icon: Lightbulb, top: "65%", left: "85%", delay: "5s", size: 44, rotate: "15deg", color: "text-blue-300 dark:text-blue-600" },
  { Icon: Zap, top: "20%", left: "50%", delay: "1.5s", size: 36, rotate: "-25deg", color: "text-sky-500 dark:text-sky-400" },
];

export default function FloatingIcons() {
  return (
    <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none z-0">
      {icons.map((item, i) => (
        <div
          key={i}
          className="absolute opacity-60 dark:opacity-25 animate-float-sticker drop-shadow-sm"
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
