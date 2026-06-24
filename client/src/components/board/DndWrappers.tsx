import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

export function DroppableColumn({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });
  
  return (
    <div ref={setNodeRef} className={`${className || ''} ${isOver ? 'ring-2 ring-indigo-500/50 bg-indigo-50/10' : ''}`}>
      {children}
    </div>
  );
}

export function DraggableTask({ id, task, disabled, children, className }: { id: string, task: any, disabled: boolean, children: React.ReactNode, className?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: task,
    disabled: disabled
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`${className || ''} ${isDragging ? 'shadow-2xl ring-2 ring-indigo-500 scale-105' : ''}`}>
      {children}
    </div>
  );
}
