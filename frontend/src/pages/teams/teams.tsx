import React, { useEffect, useState } from 'react';
import { teamsService, type Team } from '../../services/teams';
import { projectsService, type Project } from '../../services/projects';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/button';
import type { User } from '../../types/auth';
import api from '../../services/api';
import { Loader2, Plus, Users, Shield, Trash2, ArrowRight } from 'lucide-react';

interface TeamWithProject extends Team {
  projectName: string;
  projectKey: string;
}

export const TeamsPage: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role_code === 'admin';
  const isPM = currentUser?.role_code === 'project_manager';
  const canManageTeams = !isAdmin && isPM;

  const [teams, setTeams] = useState<TeamWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Team State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Manage Team Members Modal State
  const [selectedTeam, setSelectedTeam] = useState<TeamWithProject | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState<number | ''>('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const getEligibleMembersForProject = (projectId: number | '') => {
    if (!projectId) return [];
    return allUsers.filter((u) => u.role_code !== 'admin' && u.role_code !== 'project_manager');
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projList = await projectsService.list();
      setProjects(projList);

      try {
        const usersRes = await api.get<User[]>('/users');
        setAllUsers(usersRes.data);
      } catch (e) {
        console.error('Failed to load system users', e);
      }

      const teamsPromises = projList.map(async (proj) => {
        const projTeams = await teamsService.listForProject(proj.id);
        return projTeams.map((t) => ({
          ...t,
          projectName: proj.name,
          projectKey: proj.key,
        }));
      });

      const allTeamsResults = await Promise.all(teamsPromises);
      const flattenedTeams = allTeamsResults.flat();
      setTeams(flattenedTeams);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load teams data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      projectsService.listMembers(Number(selectedProjectId))
        .then(setProjectMembers)
        .catch((err) => console.error('Failed to load project members', err));
    } else {
      setProjectMembers([]);
    }
  }, [selectedProjectId]);

  const handleOpenMembersModal = async (team: TeamWithProject) => {
    setSelectedTeam(team);
    setIsMembersLoading(true);
    setMemberError(null);
    try {
      const members = await teamsService.listMembers(team.id);
      setTeamMembers(members);
      const pMembers = await projectsService.listMembers(team.project_id);
      setProjectMembers(pMembers);
      if (allUsers.length === 0) {
        const usersRes = await api.get<User[]>('/users');
        setAllUsers(usersRes.data);
      }
    } catch (err: any) {
      setMemberError('Failed to fetch team members');
    } finally {
      setIsMembersLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const params: any = {
        name: newTeamName,
        description: newTeamDesc || undefined,
        project_id: Number(selectedProjectId),
      };
      await teamsService.create(params);
      await loadData();
      setIsCreateOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      setSelectedProjectId('');
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !addMemberUserId) return;
    setIsAddingMember(true);
    setMemberError(null);
    try {
      await teamsService.addMember(selectedTeam.id, Number(addMemberUserId));
      const updated = await teamsService.listMembers(selectedTeam.id);
      setTeamMembers(updated);
      setAddMemberUserId('');
    } catch (err: any) {
      setMemberError(err.response?.data?.error?.message || 'Failed to add member to team');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveTeamMember = async (userId: number) => {
    if (!selectedTeam) return;
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      await teamsService.removeMember(selectedTeam.id, userId);
      setTeamMembers(teamMembers.filter((m) => m.id !== userId));
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to remove member');
    }
  };

  const handleDeleteTeam = async (e: React.MouseEvent, teamId: number) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;
    try {
      await teamsService.deleteTeam(teamId);
      setTeams(teams.filter((t) => t.id !== teamId));
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete team');
    }
  };

  return (
    <div className="space-y-8 font-sans text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text bg-gradient-to-r from-white to-gray-400">
            Teams
          </h1>
          <p className="text-gray-400 mt-2">
            Organize team memberships across your workspace projects
          </p>
        </div>
        {canManageTeams && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/10 transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Team</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
          <p className="text-sm text-gray-400">Loading teams...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center text-red-400">
          <p className="font-semibold">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-500/20 rounded-xl hover:bg-red-500/30 transition-all text-xs font-semibold">
            Try Again
          </button>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-[#121214]/40 border border-white/[0.06] border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center">
          <div className="p-4 rounded-full bg-white/[0.02] border border-white/[0.06] mb-4 text-gray-500">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No teams found</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Create a team under any of your projects to start organizing members.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="group bg-[#121214]/65 hover:bg-[#161619]/80 border border-white/[0.08] hover:border-purple-500/40 p-6 rounded-3xl transition-all shadow-xl hover:shadow-2xl relative overflow-hidden flex flex-col justify-between h-[220px]"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold tracking-wider text-purple-400 uppercase">
                    {team.projectKey} • {team.projectName}
                  </div>
                  {canManageTeams && (
                    <button
                      onClick={(e) => handleDeleteTeam(e, team.id)}
                      className="p-2 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/20 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"
                      title="Delete Team"
                    >
                      <Trash2 className="w-5.5 h-5.5" />
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-bold mt-4 text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                  {team.name}
                </h3>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                  {team.description || 'No description provided'}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Team Workspace</span>
                </div>
                <button
                  onClick={() => handleOpenMembersModal(team)}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold cursor-pointer border-none bg-transparent"
                >
                  <span>Members</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-2xl font-bold tracking-tight text-white mb-6">Create New Team</h3>

            <form onSubmit={handleCreateTeam} className="space-y-6">
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl">
                  {createError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Target Project</label>
                <select
                  required
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend Platform"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Description</label>
                <textarea
                  placeholder="Describe this team's focus..."
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm h-24 resize-none"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm transition-all cursor-pointer border-none bg-transparent"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Team'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-2xl font-bold tracking-tight text-white mb-2">{selectedTeam.name} Members</h3>
            <p className="text-xs text-gray-500 mb-6">Manage members assigned to this team from the project roster.</p>

            {memberError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl">
                {memberError}
              </div>
            )}

            {canManageTeams && (
              <form onSubmit={handleAddTeamMember} className="flex gap-3 mb-6">
                <select
                  required
                  value={addMemberUserId}
                  onChange={(e) => setAddMemberUserId(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                >
                  <option value="">-- Select Member to Add --</option>
                  {getEligibleMembersForProject(selectedTeam.project_id)
                    .filter((u) => !teamMembers.some((tm) => tm.id === u.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                </select>
                <Button
                  type="submit"
                  disabled={isAddingMember || !addMemberUserId}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 transition-all flex items-center gap-1.5"
                >
                  {isAddingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add</span>
                </Button>
              </form>
            )}

            <div className="max-h-60 overflow-y-auto border border-white/[0.06] rounded-2xl bg-white/[0.01]">
              {isMembersLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="p-6 text-center text-xs text-gray-500 font-medium">No members assigned to this team.</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="border-b border-white/[0.04] last:border-none hover:bg-white/[0.01] transition-colors">
                        <td className="p-3 font-semibold flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-semibold uppercase text-xs">
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          {member.full_name}
                        </td>
                        <td className="p-3 text-gray-400 text-xs">{member.email}</td>
                        <td className="p-3 text-right">
                          {canManageTeams && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamMember(member.id)}
                              className="p-2 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/20 transition-all border-none bg-transparent cursor-pointer inline-flex items-center justify-center"
                              title="Remove Member"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>


            <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                className="h-10 px-6 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm transition-all cursor-pointer border-none bg-transparent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
