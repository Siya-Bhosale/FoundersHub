import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupTeam } from '../../api/team';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  Users,
  Crown,
  Code2,
  Calendar,
  Loader2,
  AlertCircle,
  Tag,
  CheckCircle2,
} from 'lucide-react';

const DeveloperTeamPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadTeam = async () => {
      try {
        const [sRes, tRes] = await Promise.all([
          getStartupById(startupId),
          getStartupTeam(startupId),
        ]);
        if (mounted) {
          setStartup(sRes.startup);
          setTeamData(tRes);
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
        <p className="text-sm text-slate-400 font-medium">Loading team roster...</p>
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
  const members = teamData?.members || [];

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={startup}
          activeToolId="team"
          activeToolLabel="Team"
        />

        {/* Team Overview Card */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#232735] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-950/60 text-violet-400 border border-violet-800/60 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Startup Team Roster
                </h2>
                <p className="text-xs text-slate-400">
                  Collaborators actively building and launching {startup.name}.
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#171A24] text-slate-300 border border-[#2A2F42]">
              {1 + members.length} Active Members
            </span>
          </div>

          {/* Members List */}
          <div className="space-y-4">
            {/* Founder Card */}
            {founder && (
              <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/60 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {founder.name || 'Founder'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60 uppercase">
                        FOUNDER
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{founder.email || 'Startup Owner'}</span>
                  </div>
                </div>

                <span className="text-xs text-slate-400 font-medium">Venture Lead</span>
              </div>
            )}

            {/* Developer Members */}
            {members.map((member) => {
              const devUser = member.user;
              const profile = member.profile;
              const skills = profile?.skills || [];

              return (
                <div
                  key={member.id}
                  className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
                      <Code2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {devUser?.name || 'Developer'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 uppercase">
                          DEVELOPER
                        </span>
                      </div>

                      {devUser?.email && (
                        <span className="text-xs text-slate-400 block">{devUser.email}</span>
                      )}

                      {skills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#11141C] text-indigo-300 border border-indigo-900/40"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Status</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperTeamPage;
