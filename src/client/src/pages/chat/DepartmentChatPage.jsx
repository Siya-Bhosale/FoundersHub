import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStartupById } from '../../api/startups';
import { getStartupDepartments } from '../../api/departments';
import {
  getStartupChats,
  getDepartmentChat,
  getChatMessages,
  sendMessage,
} from '../../api/chats';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import StartupHeader from '../../components/common/StartupHeader';
import {
  MessageSquare,
  Send,
  Loader2,
  Users,
  ShieldAlert,
  AlertCircle,
  Building2,
  Layers,
  Sparkles,
  CheckCircle2,
  User,
  ArrowLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';

const DepartmentChatPage = () => {
  const { startupId, departmentId: routeDeptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentUserId = (user?.userId || user?.id || user?._id)?.toString();
  const userRole = user?.role?.toUpperCase();
  const isDeveloperRoute = location.pathname.startsWith('/developer/');

  const [startup, setStartup] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(routeDeptId || null);
  const [chat, setChat] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');

  const messagesEndRef = useRef(null);
  const isPollingRef = useRef(false);

  const scrollToBottom = (smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // 1. Initial Load: Load Startup & Accessible Chats
  useEffect(() => {
    let mounted = true;

    const initWorkspace = async () => {
      setLoadingInitial(true);
      setError('');
      setAuthError('');
      try {
        const [sRes, chatsRes, dRes] = await Promise.all([
          getStartupById(startupId),
          getStartupChats(startupId),
          userRole === 'FOUNDER' ? getStartupDepartments(startupId).catch(() => ({ departments: [] })) : Promise.resolve({ departments: [] }),
        ]);

        if (!mounted) return;
        setStartup(sRes.startup);

        const availableChats = chatsRes.chats || [];
        if (userRole === 'FOUNDER' && dRes.departments) {
          setDepartments(dRes.departments);
        } else {
          setDepartments([]);
        }

        if (availableChats.length === 0) {
          // Developer has no active department chat
          setChat(null);
          setLoadingInitial(false);
          return;
        }

        // For developers: ALWAYS bind strictly to their authorized department chat.
        // Prevent developers from loading any other department ID from URL params.
        let targetDeptId = routeDeptId;
        if (userRole === 'DEVELOPER' || !targetDeptId) {
          targetDeptId = availableChats[0].department?._id || availableChats[0].department?.id;
        }

        setSelectedDeptId(targetDeptId);
      } catch (err) {
        if (!mounted) return;
        if (err.status === 403) {
          setAuthError(err.message || 'Access denied to this department chat.');
        } else {
          setError(err.message || 'Failed to initialize department chat workspace.');
        }
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    };

    if (startupId) {
      initWorkspace();
    }

    return () => {
      mounted = false;
    };
  }, [startupId, routeDeptId, userRole]);

  // 2. Load Department Chat Details & Initial Messages when selectedDeptId changes
  useEffect(() => {
    if (!startupId || !selectedDeptId) return;

    let mounted = true;

    const loadChatData = async () => {
      setLoadingChat(true);
      setAuthError('');
      try {
        const chatRes = await getDepartmentChat(startupId, selectedDeptId);
        if (!mounted) return;

        setChat(chatRes.chat);
        setMembers(chatRes.members || []);

        // Load messages for this chat
        if (chatRes.chat?._id) {
          const msgRes = await getChatMessages(chatRes.chat._id);
          if (!mounted) return;
          setMessages(msgRes.messages || []);
          setTimeout(() => scrollToBottom(false), 50);
        }
      } catch (err) {
        if (!mounted) return;
        if (err.status === 403) {
          setAuthError(err.message || 'Forbidden: You do not have access to this department chat.');
        } else {
          setError(err.message || 'Failed to load department chat.');
        }
      } finally {
        if (mounted) setLoadingChat(false);
      }
    };

    loadChatData();

    return () => {
      mounted = false;
    };
  }, [startupId, selectedDeptId]);

  // 3. Polling for real-time messages (every 2.5 seconds)
  useEffect(() => {
    if (!chat?._id || authError) return;

    const pollInterval = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const msgRes = await getChatMessages(chat._id);
        if (msgRes.messages) {
          setMessages((prev) => {
            // Check if there are new messages
            if (msgRes.messages.length > prev.length) {
              setTimeout(() => scrollToBottom(true), 50);
              return msgRes.messages;
            }
            return prev;
          });
        }
      } catch (e) {
        // Silently skip background polling error
      } finally {
        isPollingRef.current = false;
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [chat?._id, authError]);

  // 4. Send Message Handler
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chat?._id || !newMessageText.trim() || sending) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    // Optimistic local update
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      id: `temp-${Date.now()}`,
      chat: chat._id,
      sender: {
        _id: currentUserId,
        id: currentUserId,
        name: user?.name || 'You',
        email: user?.email || '',
        role: user?.role || 'DEVELOPER',
      },
      message: textToSend,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 20);

    try {
      const res = await sendMessage(chat._id, textToSend);
      if (res?.data) {
        setMessages((prev) =>
          prev.map((m) => (m.isOptimistic ? res.data : m))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to send message.');
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.isOptimistic));
      setNewMessageText(textToSend);
    } finally {
      setSending(false);
      setTimeout(() => scrollToBottom(true), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loadingInitial) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Connecting to department chat...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Workspace Header */}
        {isDeveloperRoute || userRole === 'DEVELOPER' ? (
          <DeveloperWorkspaceHeader
            startup={startup}
            activeToolId="chat"
            activeToolLabel="Department Chat"
          />
        ) : (
          <StartupHeader
            startup={startup}
            toolName="Department Chat"
            toolDescription="Private team discussions isolated strictly by department."
            routePrefix="/startups"
          />
        )}

        {/* Auth Error Banner if Cross-Department Access Attempted */}
        {authError ? (
          <div className="p-8 rounded-2xl bg-[#11141C] border border-rose-900/50 shadow-2xl text-center space-y-4 max-w-lg mx-auto my-12">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Access Restricted</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{authError}</p>
            <div className="pt-2">
              <Link
                to={isDeveloperRoute || userRole === 'DEVELOPER' ? `/developer/startups/${startupId}/tasks` : `/startups/${startupId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Workspace</span>
              </Link>
            </div>
          </div>
        ) : !chat && !selectedDeptId ? (
          <div className="p-8 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl text-center space-y-4 max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center mx-auto text-indigo-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">No Department Assigned</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are not currently assigned to an active department in this startup. Department chats are private and restricted to active department members.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Department Context & Members Sidebar */}
            <div className="lg:col-span-1 space-y-5">
              {/* Founder Department Switcher (Strictly Founder Only) */}
              {userRole === 'FOUNDER' && departments.length > 0 && (
                <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-4 shadow-xl space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Select Department Chat
                  </span>
                  <select
                    value={selectedDeptId || ''}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full bg-[#171A24] text-xs text-white rounded-xl px-3 py-2 border border-[#2A2F42] hover:border-[#373E54] focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        {d.name} Team Chat
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Department Info Card */}
              <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/70 flex items-center justify-center text-indigo-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {chat?.department?.name || 'Department'}
                    </h3>
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                      Private Group Chat
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed border-t border-[#232735] pt-3">
                  {chat?.department?.description ||
                    'All discussions in this channel are private to this department.'}
                </p>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#232735] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Members</span>
                  </span>
                  <strong className="text-white">{members.length}</strong>
                </div>
              </div>

              {/* Department Members List */}
              <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#232735] pb-2.5">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Channel Members</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#171A24] text-slate-400 border border-[#2A2F42]">
                    {members.length}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      No members assigned to this department yet.
                    </p>
                  ) : (
                    members.map((m) => {
                      const u = m.user;
                      const uId = (u?._id || u?.id)?.toString();
                      const isMe = uId === currentUserId;

                      return (
                        <div
                          key={m.id || m._id}
                          className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[#171A24]/60 border border-[#232735]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800/60 flex items-center justify-center font-bold text-xs shrink-0">
                              {u?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">
                                {u?.name || 'Member'} {isMe && <span className="text-[10px] text-indigo-400">(You)</span>}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {m.departmentRole || 'Developer'}
                              </p>
                            </div>
                          </div>

                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#11141C] text-slate-400 border border-[#2A2F42] uppercase">
                            {m.role || 'DEV'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Chat Feed & Input Box */}
            <div className="lg:col-span-3 flex flex-col bg-[#11141C] rounded-2xl border border-[#232735] shadow-2xl h-[700px] overflow-hidden">
              {/* Chat Window Header */}
              <div className="p-4 border-b border-[#232735] flex items-center justify-between bg-[#171A24]/60">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{chat?.name || 'Department Team Chat'}</span>
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Isolated group channel for {chat?.department?.name || 'department'} members.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#11141C] border border-[#2A2F42]">
                    Encrypted • MongoDB Source
                  </span>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0D0F16]">
                {loadingChat ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-950/50 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">No messages yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Start the discussion with your {chat?.department?.name || 'department'} team. All messages sent here are private to your department.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const sender = msg.sender;
                    const senderId = (sender?._id || sender?.id)?.toString();
                    const isOwnMessage = senderId === currentUserId;
                    const isFounderMsg = sender?.role?.toUpperCase() === 'FOUNDER';

                    return (
                      <div
                        key={msg.id || msg._id || index}
                        className={`flex gap-3 items-start ${
                          isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                            isOwnMessage
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : isFounderMsg
                              ? 'bg-amber-950/80 border-amber-800/80 text-amber-300'
                              : 'bg-[#1E2230] border-[#2A2F42] text-slate-200'
                          }`}
                        >
                          {sender?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>

                        {/* Bubble */}
                        <div
                          className={`max-w-[75%] rounded-2xl p-3.5 space-y-1 shadow-md ${
                            isOwnMessage
                              ? 'bg-indigo-600/90 text-white rounded-tr-none border border-indigo-500/40'
                              : 'bg-[#171A24] text-slate-200 rounded-tl-none border border-[#232735]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-bold ${
                                isOwnMessage ? 'text-indigo-100' : 'text-slate-300'
                              }`}
                            >
                              {sender?.name || 'Teammate'}
                            </span>
                            {isFounderMsg && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/60 uppercase">
                                Founder
                              </span>
                            )}
                            <span
                              className={`text-[9px] ${
                                isOwnMessage ? 'text-indigo-200/70' : 'text-slate-500'
                              }`}
                            >
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-3.5 bg-[#11141C] border-t border-[#232735]">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    placeholder={`Message #${chat?.department?.name || 'department'} team...`}
                    className="flex-1 px-4 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500 transition placeholder-slate-500"
                  />

                  <button
                    type="submit"
                    disabled={sending || !newMessageText.trim()}
                    className="inline-flex items-center justify-center p-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition shadow-md shadow-indigo-600/20 cursor-pointer"
                    title="Send message"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentChatPage;
