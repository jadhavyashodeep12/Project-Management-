import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import type { User } from '../../types/auth';

interface BoardFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPriority: string;
  onPriorityChange: (priority: string) => void;
  selectedAssignee: string;
  onAssigneeChange: (assigneeId: string) => void;
  members: User[];
  onClearFilters: () => void;
}

export const BoardFilters: React.FC<BoardFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  selectedAssignee,
  onAssigneeChange,
  members,
  onClearFilters,
}) => {
  const hasActiveFilters = searchQuery !== '' || selectedPriority !== 'all' || selectedAssignee !== 'all';

  return (
    <div className="bg-[#121214]/60 border border-white/[0.06] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Filter tasks by key or title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#0d0d0f] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white bg-transparent border-none cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="bg-[#0d0d0f] border border-white/[0.08] text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-purple-500/50 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <select
          value={selectedAssignee}
          onChange={(e) => onAssigneeChange(e.target.value)}
          className="bg-[#0d0d0f] border border-white/[0.08] text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-purple-500/50 cursor-pointer"
        >
          <option value="all">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id.toString()}>
              {member.full_name}
            </option>
          ))}
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-all cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
