import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import StartupHeader from '../../components/common/StartupHeader';
import ExecutionDashboard from '../../components/execution/ExecutionDashboard';
import { Loader2, ShieldAlert } from 'lucide-react';

const ExecutionPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadStartup = async () => {
      try {
        const res = await getStartupById(startupId);
        if (mounted && res?.startup) {
          setStartup(res.startup);
          try {
            localStorage.setItem('sprintfounders_active_startup', startupId);
          } catch (e) {}
        }
      } catch (e) {
        // Handled
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (startupId) loadStartup();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading execution intelligence...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <StartupHeader
          startup={startup}
          toolName="Execution Intelligence"
          toolDescription="Deterministic milestone delivery scoring, velocity tracking, and workload distribution analytics."
          routePrefix="/execution"
          actionButton={
            <Link
              to={`/risk-analysis/${startupId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-400 bg-[#171A24] border border-amber-900/40 hover:bg-amber-950/30 transition shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Risk Analysis</span>
            </Link>
          }
        />

        <ExecutionDashboard startupId={startupId} isFounder={true} />
      </div>
    </div>
  );
};

export default ExecutionPage;
