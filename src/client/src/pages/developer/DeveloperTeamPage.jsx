import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupTeam } from '../../api/team';
import { getStartupDepartments } from '../../api/departments';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  Users,
  Crown,
  Code2,
  Calendar,
  Loader2,
  AlertCircle,
  Briefcase,
  Layers,
  Globe,
  FileText,
  CheckCircle2,
} from 'lucide-react';

const GithubIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const LinkedinIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const DeveloperTeamPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadTeam = async () => {
      try {
        const [sRes, tRes, dRes] = await Promise.all([
          getStartupById(startupId),
          getStartupTeam(startupId),
          getStartupDepartments(startupId).catch(() => ({ departments: [] })),
        ]);
        if (mounted) {
          setStartup(sRes.startup);
          setTeamData(tRes);
          setDepartments(dRes.departments || []);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load team roster');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (startupId) loadTeam();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading team & departments...</p>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#11141C] p-8 rounded-2xl border border-[#232735] shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center mx-auto border border-red-800/40">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Team Roster Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Unable to access team details for this startup.'}
          </p>
          <div className="pt-2">
            <Link
              to="/developer/my-startups"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
            >
              <span>Back to My Startups</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const founder = teamData?.founder || startup?.founder;
  const allMembers = teamData?.members || [];

  // Group members by department
  const deptMembersMap = {};
  const unassignedMembers = [];

  departments.forEach((d) => {
    deptMembersMap[d._id || d.id] = [];
  });

  allMembers.forEach((m) => {
    const deptId = m.department?._id || m.department?.id;
    if (deptId && deptMembersMap[deptId]) {
      deptMembersMap[deptId].push(m);
    } else {
      unassignedMembers.push(m);
    }
  });

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={startup}
          activeToolId="team"
          activeToolLabel="Team"
        />

        {/* Top Header Card */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#232735] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-950/60 text-violet-400 border border-violet-800/60 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Startup Team & Departments
                </h2>
                <p className="text-xs text-slate-400">
                  Collaborators organized into functional departments actively building {startup.name}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#171A24] text-slate-300 border border-[#2A2F42]">
                {1 + allMembers.length} Total Members
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                {departments.length} Departments
              </span>
            </div>
          </div>

          {/* Founder / Executive Lead Card */}
          {founder && (
            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/60 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {founder.name || 'Startup Founder'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60 uppercase">
                      FOUNDER
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{founder.email || ''}</span>
                </div>
              </div>
              <span className="text-xs text-amber-400 font-semibold px-3 py-1 rounded-lg bg-amber-950/40 border border-amber-800/40">
                Venture Lead
              </span>
            </div>
          )}

          {/* Department Sections */}
          <div className="space-y-6 pt-2">
            {departments.map((dept) => {
              const deptId = dept._id || dept.id;
              const deptMembers = deptMembersMap[deptId] || [];

              return (
                <div
                  key={deptId}
                  className="rounded-xl bg-[#171A24]/60 border border-[#232735] p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#232735]/80 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold text-white tracking-tight">
                          {dept.name}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#11141C] text-slate-300 border border-[#2A2F42]">
                          {deptMembers.length} {deptMembers.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      {dept.description && (
                        <p className="text-[11px] text-slate-400">{dept.description}</p>
                      )}
                    </div>
                  </div>

                  {deptMembers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic">
                      No members assigned to {dept.name} yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {deptMembers.map((member) => {
                        const devUser = member.user;
                        const profile = member.profile;
                        const skills = profile?.skills || [];

                        return (
                          <div
                            key={member.id || member._id}
                            className="p-4 rounded-xl bg-[#11141C] border border-[#2A2F42] hover:border-[#373E54] transition shadow-sm space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 flex items-center justify-center font-bold text-xs shrink-0">
                                  {devUser?.name ? devUser.name.charAt(0).toUpperCase() : 'D'}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white truncate max-w-[130px]">
                                    {devUser?.name || 'Developer'}
                                  </h4>
                                  <span className="text-[11px] text-indigo-400 font-medium block">
                                    {member.departmentRole || 'Developer'}
                                  </span>
                                </div>
                              </div>

                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase shrink-0">
                                {member.role || 'DEVELOPER'}
                              </span>
                            </div>

                            {skills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {skills.slice(0, 3).map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#171A24] text-slate-300 border border-[#232735]"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {skills.length > 3 && (
                                  <span className="text-[9px] text-slate-500 font-medium self-center">
                                    +{skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Social Profiles */}
                            <div className="flex items-center gap-2.5 pt-1 text-slate-400 text-xs">
                              {profile?.github && (
                                <a
                                  href={profile.github}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-white transition"
                                  title="GitHub"
                                >
                                  <GithubIcon className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {profile?.linkedin && (
                                <a
                                  href={profile.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-sky-400 transition"
                                  title="LinkedIn"
                                >
                                  <LinkedinIcon className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {profile?.portfolio && (
                                <a
                                  href={profile.portfolio}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-indigo-400 transition"
                                  title="Portfolio"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned Section */}
            {unassignedMembers.length > 0 && (
              <div className="rounded-xl bg-[#171A24]/60 border border-amber-900/30 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#232735] pb-3">
                  <h3 className="text-sm font-bold text-amber-400">Unassigned Members</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60">
                    {unassignedMembers.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {unassignedMembers.map((member) => (
                    <div
                      key={member.id || member._id}
                      className="p-3.5 rounded-xl bg-[#11141C] border border-[#2A2F42] space-y-1"
                    >
                      <span className="text-xs font-bold text-white block">{member.user?.name}</span>
                      <span className="text-[11px] text-slate-400 block">{member.user?.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperTeamPage;
