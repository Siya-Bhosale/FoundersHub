import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { askDeveloperAIMentor } from '../../api/developer';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

const QUICK_PROMPTS = [
  'What should I work on next?',
  'Which of my tasks are highest priority?',
  'Do I have any overdue tasks?',
  'How am I performing?',
  'What is blocking my progress?',
  'What should I complete before the sprint ends?',
  'Give me a summary of my current sprint.',
  'Which task should I finish today?',
  'Why is my execution score low?',
  'What should I discuss with my founder?',
];

const DeveloperAIMentorPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inputMessage, setInputMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Hello! I am your AI Developer Mentor for this startup. I can help you prioritize your assigned tasks, break down complex requirements, understand the active sprint goal, and eliminate blockers.',
      actions: [
        'Ask for your highest priority task',
        'Review the sprint objectives',
        'Identify blocked dependencies',
      ],
      references: ['Sprint active milestones', 'Assigned Kanban tasks'],
      source: 'gemini',
      createdAt: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    let mounted = true;
    const fetchStartup = async () => {
      try {
        const res = await getStartupById(startupId);
        if (mounted && res?.startup) {
          setStartup(res.startup);
          try {
            localStorage.setItem('sprintfounders_active_startup', startupId);
          } catch (e) {}
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to access startup AI Mentor');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (startupId) fetchStartup();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  const handleSendMessage = async (queryText) => {
    const textToSend = (queryText || inputMessage).trim();
    if (!textToSend || submitting) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    const historyForApi = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.text || '',
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSubmitting(true);

    try {
      const res = await askDeveloperAIMentor(startupId, textToSend, historyForApi);
      if (res?.success) {
        const assistantMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: res.answer,
          actions: res.actions || [],
          references: res.references || [],
          source: res.source || 'gemini',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'error',
        text: err.message || 'Failed to receive mentor guidance. Please try again.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading AI Developer Mentor...</p>
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
          <h2 className="text-xl font-bold text-white">AI Mentor Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'You do not have permission to access the AI Mentor for this startup.'}
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

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={startup}
          activeToolId="ai-mentor"
          activeToolLabel="AI Mentor"
        />

        {/* AI Mentor Chat Surface */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] shadow-xl overflow-hidden flex flex-col min-h-[620px]">
          {/* Surface Header */}
          <div className="p-5 border-b border-[#232735] flex items-center justify-between bg-[#171A24]/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-950/60 text-violet-400 border border-violet-800/60 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>AI Developer Mentor</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 uppercase">
                    Startup-Context Aware
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Grounded in {startup.name}'s active sprint, assigned tasks, and execution metrics.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-4 bg-[#141721] border-b border-[#232735] flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Suggested:</span>
            </span>
            {QUICK_PROMPTS.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                disabled={submitting}
                onClick={() => handleSendMessage(promptText)}
                className="text-xs font-medium px-3 py-1 rounded-xl bg-[#1A1E2B] border border-[#2A2F42] hover:border-violet-500/50 hover:bg-[#202536] text-slate-300 hover:text-white transition whitespace-nowrap disabled:opacity-50 cursor-pointer"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Message Thread */}
          <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[500px] scrollbar-thin">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isError = msg.role === 'error';

              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-xl p-4 rounded-2xl rounded-tr-sm bg-indigo-600 text-white shadow-md text-xs sm:text-sm font-medium leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              if (isError) {
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-xl p-4 rounded-2xl rounded-tl-sm bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs sm:text-sm leading-relaxed flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{msg.text}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-950/60 text-violet-400 border border-violet-800/60 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="max-w-2xl bg-[#171A24] border border-[#2A2F42] p-5 rounded-2xl rounded-tl-sm shadow-md space-y-3.5">
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </p>

                    {msg.actions && msg.actions.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#232735]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Recommended Actions:
                        </span>
                        <div className="space-y-1">
                          {msg.actions.map((act, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.references && msg.references.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#232735]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Verified Context References:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.references.map((ref, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#1F2433] text-indigo-300 border border-[#2D3349]"
                            >
                              {ref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        <span>{msg.source === 'gemini' ? 'Gemini 2.0 AI' : 'Context-Aware Engine'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {submitting && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-950/60 text-violet-400 border border-violet-800/60 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-[#171A24] border border-[#2A2F42] px-4 py-3 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                  <span>Consulting startup context and sprint priorities...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-[#141721] border-t border-[#232735]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask AI Mentor (e.g., 'What should I work on next?')"
                disabled={submitting}
                className="flex-1 px-4 py-3 rounded-xl bg-[#11141C] border border-[#2A2F42] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || submitting}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 shadow-md shadow-violet-600/20 transition cursor-pointer"
              >
                <span>Ask</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperAIMentorPage;
