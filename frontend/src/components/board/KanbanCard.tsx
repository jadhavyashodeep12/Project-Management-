import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../services/tasks';
import type { User } from '../../types/auth';
import { GripVertical } from 'lucide-react';

interface KanbanCardProps {
  task: Task;
  currentUser: User | null;
  ownerId: number;
  teamLeads: number[];
  onStatusChange: (taskId: number, newStatus: string) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  currentUser,
  ownerId,
  teamLeads,
  onStatusChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOwner = currentUser?.id === ownerId;
  const isTeamLead = teamLeads.includes(currentUser?.id || -1);
  const isAssignee = task.assignee_id === currentUser?.id;
  const isCreator = task.creator_id === currentUser?.id;
  const canEditStatus = isOwner || isTeamLead || isAssignee || isCreator;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#121214]/80 border ${
        isDragging ? 'border-purple-500 shadow-xl shadow-purple-500/20' : 'border-white/[0.08] hover:border-purple-500/40'
      } p-4 rounded-xl space-y-3 transition-all group relative cursor-default`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-600 hover:text-purple-400 rounded transition-colors"
            title="Drag task"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            {task.key}
          </span>
        </div>

        {/* Priority Badge */}
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            task.priority === 'urgent'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : task.priority === 'high'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : task.priority === 'medium'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}
        >
          {task.priority}
        </span>
      </div>

      <h5 className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors line-clamp-2">
        {task.title}
      </h5>

      {task.description && (
        <p className="text-xs text-gray-400 line-clamp-2">{task.description}</p>
      )}

      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
        {canEditStatus ? (
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className="bg-[#0d0d0f] text-gray-300 text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] focus:border-purple-500 outline-none cursor-pointer"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>
        ) : (
          <span className="bg-[#0d0d0f] text-gray-400 text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] capitalize">
            {task.status.replace('_', ' ')}
          </span>
        )}

        {task.assignee ? (
          <div className="flex items-center gap-1.5 text-gray-400 text-[10px]" title={task.assignee.full_name}>
            <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-[9px] uppercase border border-purple-500/30">
              {task.assignee.first_name[0]}
            </div>
            <span>{task.assignee.first_name}</span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-600 italic">Unassigned</span>
        )}
      </div>
    </div>
  );
};
