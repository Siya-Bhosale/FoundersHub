import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { askCopilot } from '../../api/pitch';
import { getStartupById } from '../../api/startups';
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  DollarSign,
  ListChecks,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'What should we focus on this week?',
  'Analyze our current risks',
  'Are we ready for investors?',
  'How is our financial position?',
  'Which tasks should we prioritize?',
];

const AIMentorPage = () => {
  const { startupId } = useParams();

  const [startup, setStartup] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  // Load startup details initially
  useEffect(() => {
    const fetchStartup = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const res = await getStartupById(startupId);
        const st = res.startup || res.data || null;
        setStartup(st);

        // Initial welcome message from AI Mentor
        setMessages([
          {
            sender: 'copilot',
            text: `Hello Founder! I am your AI Mentor for ${st?.name || 'your startup'}. I have real-time access to your sprint tasks, execution score, team skills, and financial runway metrics. What would you like to evaluate today?`,
            actions: [
              'Ask for this week\'s focus',
              'Audit delivery bottlenecks',
              'Check investor readiness',
            ],
            source: 'gemini',
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        console.error('Error fetching startup for copilot:', err);
        setError(err.message || 'Unable to load startup context');
      } finally {
        setInitialLoading(false);
      }
    };

    if (startupId) {
      fetchStartup();
    }
  }, [startupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || thinking) return;

    const historyForApi = messages
      .filter((m) => m.sender === 'user' || m.sender === 'copilot')
      .slice(-10)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text || '',
      }));

    // Add user message to thread
    const userMsg = {
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setThinking(true);
    setError(null);

    try {
      const res = await askCopilot(startupId, query, historyForApi);
      const copilotMsg = {
        sender: 'copilot',
        text: res.answer || 'Consult your operational dashboards for active task metrics.',
        actions: res.actions || [],
        references: res.references || [],
        source: res.source || 'gemini',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err) {
      console.error('Copilot query error:', err);
      setError(err.message || 'Failed to communicate with AI Mentor.');
      setMessages((prev) => [
        ...prev,
        {
          sender: 'copilot',
          text: 'I encountered an issue analyzing your live metrics. Please verify your connection or try asking again.',
          actions: ['Retry question', 'Check tasks board'],
          source: 'fallback',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Syncing Operational Context...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={`/startups/${startupId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {startup?.name || 'Startup Overview'}</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                AI Mentor
              </h1>
              <p className="text-xs text-slate-400">
                Your startup execution copilot • Grounded in {startup?.name} metrics
              </p>
            </div>
          </div>
        </div>

        <Link
          to={`/pitch/${startupId}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pitch Generator</span>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Suggested Prompt Chips Bar */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
          Suggested Strategic Prompts
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {SUGGESTED_PROMPTS.map((promptText) => (
            <button
              key={promptText}
              type="button"
              disabled={thinking}
              onClick={() => handleSendMessage(promptText)}
              className="shrink-0 text-xs font-medium text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:border-indigo-500 hover:text-white px-3 py-1.5 rounded-full transition disabled:opacity-50"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <div className="bg-[#11141C] rounded-2xl border border-[#232735] shadow-2xl flex flex-col h-[560px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={index}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-950/70 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-xl rounded-2xl p-4 space-y-2.5 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-[#171A24] text-slate-200 border border-[#2A2F42]'
                  }`}
                >
                  <p className="whitespace-pre-line font-normal">{msg.text}</p>

                  {/* Actions / Recommendations */}
                  {!isUser && msg.actions && msg.actions.length > 0 && (
                    <div className="pt-2 border-t border-[#232735] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                        Recommended Actions
                      </span>
                      <div className="space-y-1">
                        {msg.actions.map((act, actIdx) => (
                          <div
                            key={actIdx}
                            className="flex items-start gap-1.5 text-[11px] text-slate-300"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Context References */}
                  {!isUser && msg.references && msg.references.length > 0 && (
                    <div className="pt-2 border-t border-[#232735] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                        Verified Context References
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.references.map((ref, refIdx) => (
                          <span
                            key={refIdx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#1F2433] text-indigo-300 border border-[#2D3349]"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source indicator */}
                  {!isUser && msg.source && (
                    <div className="pt-1 flex items-center justify-end text-[9px] text-slate-400">
                      <span>{msg.source === 'gemini' ? 'AI Grounded • Google Gemini' : 'Deterministic Fallback Analysis'}</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {thinking && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-950/70 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-[#171A24] border border-[#2A2F42] rounded-2xl px-4 py-3 text-xs text-indigo-300 flex items-center gap-2 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span className="animate-pulse">AI Mentor is evaluating current sprint & financial health...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 bg-[#141722] border-t border-[#232735]">
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
              onKeyDown={handleKeyDown}
              disabled={thinking}
              placeholder="Ask your AI Mentor about sprint focus, risks, or investor readiness..."
              className="flex-1 px-4 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || thinking}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition shadow-md shadow-indigo-600/20"
            >
              {thinking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIMentorPage;
