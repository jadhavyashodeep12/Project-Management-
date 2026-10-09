import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task } from '../../services/tasks';
import type { User } from '../../types/auth';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  currentUser: User | null;
  ownerId: number;
  teamLeads: number[];
  onStatusChange: (taskId: number, newStatus: string) => void;
  onDeleteTask?: (taskId: number) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color,
  tasks,
  currentUser,
  ownerId,
  teamLeads,
  onStatusChange,
  onDeleteTask,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  const taskIds = tasks.map((t) => t.id.toString());

  return (
    <div
      ref={setNodeRef}
      className={`border border-white/[0.06] border-t-4 ${color} ${isOver ? 'ring-2 ring-purple-500/50 bg-purple-500/5' : ''
        } p-4 rounded-2xl flex flex-col justify-between min-h-[450px] transition-all`}
    >
      <div className="space-y-3 flex-1 flex flex-col">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-300">{title}</h4>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] font-bold text-gray-400">
            {tasks.length}
          </span>
        </div>

        {/* Task Cards Container */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 flex-1">
            {tasks.length === 0 ? (
              <div className="h-full min-h-[150px] flex items-center justify-center border border-white/[0.04] border-dashed rounded-xl p-6 text-center">
                <p className="text-xs text-gray-500 italic">No tasks in {title}</p>
              </div>
            ) : (
              tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  currentUser={currentUser}
                  ownerId={ownerId}
                  teamLeads={teamLeads}
                  onStatusChange={onStatusChange}
                  onDeleteTask={onDeleteTask}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

