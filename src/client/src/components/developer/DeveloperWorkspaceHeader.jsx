import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getMyDeveloperStartups } from '../../api/developer';
import {
  Building2,
  ChevronDown,
  ArrowLeft,
  LayoutDashboard,
  SquareCheck,
  Activity,
  CalendarDays,
  Users,
  Bot,
  Sparkles,
  ShieldAlert,
  Tag,
} from 'lucide-react';

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-950/60 text-sky-400 border-sky-800/60' },
  MVP: { label: 'MVP', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  GROWTH: { label: 'Growth', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
};

const WORKSPACE_TOOLS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, pathSuffix: '' },
  { id: 'tasks', label: 'My Tasks', icon: SquareCheck, pathSuffix: '/tasks' },
  { id: 'execution', label: 'Execution', icon: Activity, pathSuffix: '/execution' },
  { id: 'sprint', label: 'Sprint', icon: CalendarDays, pathSuffix: '/sprint' },
  { id: 'team', label: 'Team', icon: Users, pathSuffix: '/team' },
  { id: 'ai-mentor', label: 'AI Mentor', icon: Bot, pathSuffix: '/ai-mentor' },
  { id: 'analyzer', label: 'Startup Analyzer', icon: Sparkles, pathSuffix: '/analyzer' },
  { id: 'risk-analysis', label: 'Risk Analysis', icon: ShieldAlert, pathSuffix: '/risk-analysis' },
];

const DeveloperWorkspaceHeader = ({
  startup,
  activeToolId = 'overview',
  activeToolLabel = 'Overview',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [allStartups, setAllStartups] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const startupId = startup?.id || startup?._id;

  useEffect(() => {
    let mounted = true;
    const loadStartups = async () => {
      try {
        const res = await getMyDeveloperStartups();
        if (mounted && res?.startups) {
          setAllStartups(res.startups);
        }
      } catch (e) {}
    };
    loadStartups();
    return () => {
      mounted = false;
    };
  }, []);

  const stageInfo = (startup?.stage && STAGE_CONFIG[startup.stage]) || {
    label: startup?.stage || 'MVP',
    color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
  };

  const handleSwitchStartup = (newId) => {
    setIsDropdownOpen(false);
    try {
      localStorage.setItem('sprintfounders_active_startup', newId);
    } catch (e) {}
    // If on a sub-tool, stay on that sub-tool for the new startup
    const currentSuffix = WORKSPACE_TOOLS.find((t) => t.id === activeToolId)?.pathSuffix || '';
    navigate(`/developer/startups/${newId}${currentSuffix}`);
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Top Breadcrumb & Return Link */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link
            to="/developer/my-startups"
            className="hover:text-white transition flex items-center gap-1 font-medium"
          >
            <span>My Startups</span>
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-semibold">{startup?.name || 'Startup'}</span>
          <span>/</span>
          <span className="text-indigo-400 font-semibold">{activeToolLabel}</span>
        </div>

        <Link
          to="/developer/my-startups"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Startups</span>
        </Link>
      </div>

      {/* Main Identity Banner */}
      <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Startup Selector */}
              <div className="relative inline-block">
                {allStartups.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] text-xs font-semibold text-white transition"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{startup?.name || 'Active Startup'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>{startup?.name || 'Startup Workspace'}</span>
                  </span>
                )}

                {isDropdownOpen && allStartups.length > 1 && (
                  <div className="absolute left-0 mt-2 w-60 rounded-xl bg-[#171A24] border border-[#2A2F42] shadow-2xl z-30 py-1">
                    <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 block border-b border-[#232735]">
                      Switch Startup
                    </span>
                    {allStartups.map((s) => {
                      const sid = s.id || s._id;
                      const isCurrent = sid === startupId;
                      return (
                        <button
                          key={sid}
                          type="button"
                          onClick={() => handleSwitchStartup(sid)}
                          className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between ${
                            isCurrent
                              ? 'bg-indigo-950/60 text-indigo-300 font-semibold'
                              : 'text-slate-300 hover:bg-[#1E2330]'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stage & Industry */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${stageInfo.color}`}
              >
                {stageInfo.label}
              </span>
              {startup?.industry && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-300 bg-[#171A24] px-2 py-0.5 rounded-md border border-[#2A2F42]">
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  {startup.industry}
                </span>
              )}
            </div>

            {startup?.tagline && (
              <p className="text-xs text-slate-400 pt-0.5">{startup.tagline}</p>
            )}
          </div>

          {/* Role & Team Metadata */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Your Role</span>
              <span className="text-xs font-bold text-emerald-400">DEVELOPER</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Team</span>
              <span className="text-xs font-bold text-slate-200">{startup?.teamSize || 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Horizontal Workspace Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-4 border-t border-[#232735] scrollbar-none">
          {WORKSPACE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const targetPath = `/developer/startups/${startupId}${tool.pathSuffix}`;
            const isActive =
              tool.id === 'overview'
                ? location.pathname === `/developer/startups/${startupId}`
                : location.pathname.startsWith(`/developer/startups/${startupId}${tool.pathSuffix}`);

            return (
              <Link
                key={tool.id}
                to={targetPath}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#171A24]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tool.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeveloperWorkspaceHeader;
