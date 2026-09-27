import React, { useEffect, useState } from 'react';
import { projectsService, type Project } from '../../services/projects';
import { Button } from '../../components/ui/button';
import { Loader2, Plus, Calendar, Folder, ArrowRight } from 'lucide-react';

interface ProjectListProps {
  onSelectProject: (projectId: number) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectKey, setNewProjectKey] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectsService.list();
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setFormError(null);
    try {
      const created = await projectsService.create({
        name: newProjectName,
        key: newProjectKey,
        description: newProjectDesc || undefined,
      });
      setProjects([created, ...projects]);
      setIsModalOpen(false);
      // Reset form
      setNewProjectName('');
      setNewProjectKey('');
      setNewProjectDesc('');
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to create project. Please verify inputs.');
    } finally {
      setIsCreating(false);
    }
  };

  // Helper to generate key automatically from name
  const handleNameChange = (name: string) => {
    setNewProjectName(name);
    // Auto-generate key: take uppercase initials up to 5 chars
    const cleaned = name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    if (cleaned.length >= 2) {
      setNewProjectKey(cleaned.slice(0, 5));
    } else {
      setNewProjectKey(name.slice(0, 3).toUpperCase());
    }
  };

  return (
    <div className="space-y-8 font-sans text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text bg-gradient-to-r from-white to-gray-400">
            Projects
          </h1>
          <p className="text-gray-400 mt-2">
            Manage your workspace projects, boards, and members
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/10 transition-all cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
          <p className="text-sm text-gray-400">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center text-red-400">
          <p className="font-semibold">{error}</p>
          <button onClick={fetchProjects} className="mt-4 px-4 py-2 bg-red-500/20 rounded-xl hover:bg-red-500/30 transition-all text-xs font-semibold">
            Try Again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-[#121214]/40 border border-white/[0.06] border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center">
          <div className="p-4 rounded-full bg-white/[0.02] border border-white/[0.06] mb-4 text-gray-500">
            <Folder className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No projects found</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            You don't have access to any projects. Click the "New Project" button to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="group bg-[#121214]/65 hover:bg-[#161619]/80 border border-white/[0.08] hover:border-purple-500/40 p-6 rounded-3xl transition-all shadow-xl hover:shadow-2xl hover:shadow-purple-500/5 cursor-pointer relative overflow-hidden flex flex-col justify-between h-[200px]"
            >
              {/* Decorative glows */}
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-purple-500/5 group-hover:bg-purple-500/10 blur-xl transition-all" />
              
              <div>
                <div className="flex items-start justify-between">
                  <div className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-bold tracking-wider text-purple-400 uppercase">
                    {project.key}
                  </div>
                  <span className="text-xs text-gray-500 font-medium capitalize">
                    {project.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-4 text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                  {project.description || 'No description provided'}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 text-purple-400 group-hover:translate-x-1 transition-transform font-semibold">
                  <span>Enter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-2xl font-bold tracking-tight text-white mb-6">Create New Project</h3>
            
            <form onSubmit={handleCreate} className="space-y-6">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Platform"
                  value={newProjectName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#0d0d0f]/80 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-600 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Project Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NGP"
                  value={newProjectKey}
                  onChange={(e) => setNewProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full bg-[#0d0d0f]/80 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-600 text-sm"
                />
                <p className="text-[10px] text-gray-500 font-medium">Used as the prefix for all task IDs (e.g. NGP-101). Keep it short (2-5 letters).</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Description</label>
                <textarea
                  placeholder="Briefly describe the project goals..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full bg-[#0d0d0f]/80 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-600 text-sm h-24 resize-none"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError(null);
                  }}
                  className="flex-1 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm transition-all cursor-pointer border-none bg-transparent"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 h-11 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
