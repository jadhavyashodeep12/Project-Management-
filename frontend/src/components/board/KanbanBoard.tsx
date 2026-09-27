import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Task } from '../../services/tasks';
import type { User } from '../../types/auth';
import { BoardFilters } from './BoardFilters';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  tasks: Task[];
  members: User[];
  currentUser: User | null;
  ownerId: number;
  teamLeads: number[];
  onStatusChange: (taskId: number, newStatus: string) => void;
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'border-t-gray-500 bg-gray-500/5' },
  { id: 'in_progress', title: 'In Progress', color: 'border-t-blue-500 bg-blue-500/5' },
  { id: 'in_review', title: 'In Review', color: 'border-t-purple-500 bg-purple-500/5' },
  { id: 'done', title: 'Done', color: 'border-t-green-500 bg-green-500/5' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  members,
  currentUser,
  ownerId,
  teamLeads,
  onStatusChange,
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');

  // Drag Overlay State
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure Sensors (distance threshold prevents accidental drags on clicks)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Filter tasks based on search & drop downs
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter (title or key)
      const matchesSearch =
        searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.key.toLowerCase().includes(searchQuery.toLowerCase());

      // Priority filter
      const matchesPriority =
        selectedPriority === 'all' || task.priority.toLowerCase() === selectedPriority.toLowerCase();

      // Assignee filter
      let matchesAssignee = true;
      if (selectedAssignee === 'unassigned') {
        matchesAssignee = !task.assignee_id;
      } else if (selectedAssignee !== 'all') {
        matchesAssignee = task.assignee_id === parseInt(selectedAssignee, 10);
      }

      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, selectedPriority, selectedAssignee]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPriority('all');
    setSelectedAssignee('all');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskIdStr = event.active.id.toString();
    const task = tasks.find((t) => t.id.toString() === taskIdStr);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = parseInt(active.id.toString(), 10);
    const overId = over.id.toString();

    // Determine target column ID (either a column id directly like 'todo', or a task id inside a column)
    let targetColumnId = overId;
    if (!COLUMNS.some((col) => col.id === overId)) {
      // Over is a task, find its status
      const overTask = tasks.find((t) => t.id.toString() === overId);
      if (overTask) {
        targetColumnId = overTask.status;
      }
    }

    const activeTask = tasks.find((t) => t.id === activeTaskId);
    if (activeTask && activeTask.status !== targetColumnId) {
      // Check authorization before triggering update
      const isOwner = currentUser?.id === ownerId;
      const isTeamLead = teamLeads.includes(currentUser?.id || -1);
      const isAssignee = activeTask.assignee_id === currentUser?.id;
      const isCreator = activeTask.creator_id === currentUser?.id;
      const canEdit = isOwner || isTeamLead || isAssignee || isCreator;

      if (canEdit) {
        onStatusChange(activeTaskId, targetColumnId);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Board Filters */}
      <BoardFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        selectedAssignee={selectedAssignee}
        onAssigneeChange={setSelectedAssignee}
        members={members}
        onClearFilters={handleClearFilters}
      />

      {/* DndContext & Board Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                tasks={columnTasks}
                currentUser={currentUser}
                ownerId={ownerId}
                teamLeads={teamLeads}
                onStatusChange={onStatusChange}
              />
            );
          })}
        </div>

        {/* Drag Overlay Ghost */}
        <DragOverlay>
          {activeTask ? (
            <KanbanCard
              task={activeTask}
              currentUser={currentUser}
              ownerId={ownerId}
              teamLeads={teamLeads}
              onStatusChange={onStatusChange}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
