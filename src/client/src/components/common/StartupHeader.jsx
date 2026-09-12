import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyStartups } from '../../api/startups';
import { getMyDeveloperStartups } from '../../api/developer';
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  Tag,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-950/60 text-sky-400 border-sky-800/60' },
  MVP: { label: 'MVP', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  GROWTH: { label: 'Growth', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
};

const StartupHeader = ({
  startup,
  toolName,
  toolDescription,
  routePrefix = '',
  actionButton = null,
}) => {
  const navigate = useNavigate();
  const [allStartups, setAllStartups] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadMyStartups = async () => {
      try {
        let res = await getMyStartups().catch(() => null);
        if (!res?.startups || res.startups.length === 0) {
          res = await getMyDeveloperStartups().catch(() => null);
        }
        if (mounted && res?.startups) {
          setAllStartups(res.startups);
        }
      } catch (e) {
        // Quiet fallback
      }
    };
    loadMyStartups();
    return () => {
      mounted = false;
    };
  }, []);

  const startupId = startup?.id || startup?._id;
  const stageInfo = (startup?.stage && STAGE_CONFIG[startup.stage]) || {
    label: startup?.stage || 'MVP',
    color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
  };

  const handleSelectStartup = (newId) => {
    setIsDropdownOpen(false);
    try {
      localStorage.setItem('sprintfounders_active_startup', newId);
    } catch (e) {}
    if (routePrefix) {
      navigate(`${routePrefix}/${newId}`);
    } else {
      navigate(`/startups/${newId}`);
    }
  };

  return (
    <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Startup Identity & Tool Title */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Startup Selector Dropdown if multiple startups */}
            <div className="relative inline-block">
              {allStartups.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] text-xs font-semibold text-white transition"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{startup?.name || 'Select Startup'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{startup?.name || 'Active Startup'}</span>
                </span>
              )}

              {isDropdownOpen && allStartups.length > 1 && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl bg-[#171A24] border border-[#2A2F42] shadow-2xl z-30 py-1">
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
                        onClick={() => handleSelectStartup(sid)}
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

            {/* Stage & Industry Badges */}
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${stageInfo.color}`}
            >
              {stageInfo.label}
            </span>
            {startup?.industry && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-[#171A24] px-2.5 py-0.5 rounded-md border border-[#2A2F42]">
                <Tag className="w-3 h-3 text-slate-400" />
                {startup.industry}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-3 pt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {toolName}
            </h1>
          </div>

          {toolDescription && (
            <p className="text-xs sm:text-sm text-slate-400 font-normal">
              {toolDescription}
            </p>
          )}
        </div>

        {/* Right Actions: Optional Custom Action + Back to Overview */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actionButton}

          {startupId && (
            <Link
              to={`/startups/${startupId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Overview</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartupHeader;
