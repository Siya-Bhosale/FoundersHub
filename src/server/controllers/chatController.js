const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const ChatMessage = require('../models/ChatMessage');
const Startup = require('../models/Startup');
const Department = require('../models/Department');
const TeamMembership = require('../models/TeamMembership');

/**
 * Check if current user is founder or active member of startup.
 */
async function canAccessStartup(startupId, reqUser) {
  if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
    return { allowed: false, notFound: true };
  }

  const startup = await Startup.findById(startupId);
  if (!startup) return { allowed: false, notFound: true };

  const userId = (reqUser?.userId || reqUser?.id || reqUser?._id || reqUser)?.toString();
  const userRole = (reqUser?.role || '').toUpperCase();
  const founderId = (startup.founder?._id || startup.founder || startup.founderId)?.toString();
  const currentUserId = userId || '';

  // Only consider as founder if authenticated user role is FOUNDER
  if (userRole === 'FOUNDER' && founderId && founderId === currentUserId) {
    return { allowed: true, startup, isFounder: true };
  }

  if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
    return { allowed: false, startup, notFound: false };
  }

  const membership = await TeamMembership.findOne({
    startup: startupId,
    user: new mongoose.Types.ObjectId(currentUserId),
    status: 'ACTIVE',
  });

  if (membership) {
    return { allowed: true, startup, isFounder: false, membership };
  }

  return { allowed: false, startup, notFound: false };
}

/**
 * Helper to ensure a department chat exists
 */
async function ensureDepartmentChat(startupId, departmentId, departmentName) {
  let chat = await Chat.findOne({
    startup: startupId,
    department: departmentId,
    type: 'DEPARTMENT',
  });

  if (!chat) {
    const name = departmentName ? `${departmentName} Team Chat` : 'Department Team Chat';
    try {
      chat = await Chat.create({
        startup: startupId,
        department: departmentId,
        name,
        type: 'DEPARTMENT',
      });
    } catch (err) {
      // Race condition fallback
      chat = await Chat.findOne({
        startup: startupId,
        department: departmentId,
        type: 'DEPARTMENT',
      });
    }
  }

  return chat;
}

/**
 * GET /api/chats/startup/:startupId
 * List department chats accessible to the current user:
 * - Founder: all department chats belonging to their startup.
 * - Developer: ONLY the chat belonging to their active department.
 */
const getStartupChats = async (req, res) => {
  try {
    const { startupId } = req.params;

    const access = await canAccessStartup(startupId, req.user);
    if (access.notFound) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied to this startup workspace' });
    }

    if (access.isFounder) {
      // Founder sees all department chats in their startup
      const departments = await Department.find({ startup: startupId }).sort({ createdAt: 1 });

      const chats = await Promise.all(
        departments.map(async (d) => {
          const chat = await ensureDepartmentChat(startupId, d._id, d.name);
          const messageCount = await ChatMessage.countDocuments({ chat: chat._id });
          const lastMessage = await ChatMessage.findOne({ chat: chat._id })
            .sort({ createdAt: -1 })
            .populate('sender', 'name role');

          return {
            id: chat._id.toString(),
            _id: chat._id.toString(),
            startup: startupId,
            department: {
              id: d._id.toString(),
              _id: d._id.toString(),
              name: d.name,
              description: d.description || '',
              isDefault: d.isDefault,
            },
            name: chat.name,
            type: chat.type,
            messageCount,
            lastMessage: lastMessage
              ? {
                  id: lastMessage._id.toString(),
                  sender: lastMessage.sender?.name || 'Team Member',
                  message: lastMessage.message,
                  createdAt: lastMessage.createdAt,
                }
              : null,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: chats.length,
        chats,
        isFounder: true,
      });
    }

    // DEVELOPER: Strictly show ONLY their active department chat
    const membership = access.membership;
    if (!membership.department) {
      return res.status(200).json({
        success: true,
        count: 0,
        chats: [],
        isFounder: false,
        message: 'No department assigned yet.',
      });
    }

    const dept = await Department.findById(membership.department);
    if (!dept) {
      return res.status(200).json({
        success: true,
        count: 0,
        chats: [],
        isFounder: false,
      });
    }

    const chat = await ensureDepartmentChat(startupId, dept._id, dept.name);
    const messageCount = await ChatMessage.countDocuments({ chat: chat._id });
    const lastMessage = await ChatMessage.findOne({ chat: chat._id })
      .sort({ createdAt: -1 })
      .populate('sender', 'name role');

    const formattedChat = {
      id: chat._id.toString(),
      _id: chat._id.toString(),
      startup: startupId,
      department: {
        id: dept._id.toString(),
        _id: dept._id.toString(),
        name: dept.name,
        description: dept.description || '',
        isDefault: dept.isDefault,
      },
      name: chat.name,
      type: chat.type,
      messageCount,
      lastMessage: lastMessage
        ? {
            id: lastMessage._id.toString(),
            sender: lastMessage.sender?.name || 'Team Member',
            message: lastMessage.message,
            createdAt: lastMessage.createdAt,
          }
        : null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };

    return res.status(200).json({
      success: true,
      count: 1,
      chats: [formattedChat],
      isFounder: false,
    });
  } catch (error) {
    console.error('Error fetching startup chats:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching chats' });
  }
};

/**
 * GET /api/chats/startup/:startupId/department/:departmentId
 * Get or initialize a department chat and retrieve department member context.
 * Strict authorization: developer must actively belong to departmentId.
 */
const getDepartmentChat = async (req, res) => {
  try {
    const { startupId, departmentId } = req.params;

    const access = await canAccessStartup(startupId, req.user);
    if (access.notFound) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied to this startup workspace' });
    }

    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ success: false, message: 'Valid department ID is required' });
    }

    const dept = await Department.findOne({ _id: departmentId, startup: startupId });
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found in this startup' });
    }

    // Strict Cross-Department Authorization Check:
    // If not founder, developer's active membership department must match requested department!
    if (!access.isFounder) {
      const devDeptId = access.membership?.department?.toString();
      if (!devDeptId || devDeptId !== departmentId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only access the chat for your own department',
        });
      }
    }

    const chat = await ensureDepartmentChat(startupId, dept._id, dept.name);

    // Fetch active members of this department
    const members = await TeamMembership.find({
      startup: startupId,
      department: departmentId,
      status: 'ACTIVE',
    })
      .populate('user', 'name email role avatar')
      .lean();

    const formattedMembers = members.map((m) => ({
      id: m._id.toString(),
      _id: m._id.toString(),
      user: m.user,
      role: m.role,
      departmentRole: m.departmentRole || 'Developer',
      joinedAt: m.joinedAt || m.createdAt,
    }));

    return res.status(200).json({
      success: true,
      chat: {
        id: chat._id.toString(),
        _id: chat._id.toString(),
        startup: startupId,
        department: {
          id: dept._id.toString(),
          _id: dept._id.toString(),
          name: dept.name,
          description: dept.description || '',
          isDefault: dept.isDefault,
        },
        name: chat.name,
        type: chat.type,
        createdAt: chat.createdAt,
      },
      members: formattedMembers,
      isFounder: access.isFounder,
    });
  } catch (error) {
    console.error('Error fetching department chat:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching department chat' });
  }
};

/**
 * GET /api/chats/:chatId/messages
 * Retrieve messages for a department chat.
 * Strict authorization: user must be startup founder or active member of the chat's department.
 */
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: 'Valid chat ID is required' });
    }

    const chat = await Chat.findById(chatId).populate('department').populate('startup');
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const startupId = chat.startup?._id || chat.startup;
    const access = await canAccessStartup(startupId, req.user);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied to this startup workspace' });
    }

    // Enforce developer must belong to chat's department
    if (!access.isFounder) {
      const devDeptId = access.membership?.department?.toString();
      const chatDeptId = (chat.department?._id || chat.department)?.toString();

      if (!devDeptId || devDeptId !== chatDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot view messages for another department',
        });
      }
    }

    const messages = await ChatMessage.find({ chat: chatId })
      .populate('sender', 'name email role')
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map((m) => ({
      id: m._id.toString(),
      _id: m._id.toString(),
      chat: chatId,
      sender: m.sender,
      message: m.message,
      createdAt: m.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: formattedMessages.length,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching messages' });
  }
};

/**
 * POST /api/chats/:chatId/messages
 * Send a message in a department chat.
 * Strict authorization: user must be startup founder or active member of the chat's department.
 */
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: 'Valid chat ID is required' });
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Message cannot exceed 2000 characters' });
    }

    const chat = await Chat.findById(chatId).populate('department').populate('startup');
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const startupId = chat.startup?._id || chat.startup;
    const access = await canAccessStartup(startupId, req.user);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied to this startup workspace' });
    }

    // Enforce developer must belong to chat's department
    if (!access.isFounder) {
      const devDeptId = access.membership?.department?.toString();
      const chatDeptId = (chat.department?._id || chat.department)?.toString();

      if (!devDeptId || devDeptId !== chatDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot post messages to another department chat',
        });
      }
    }

    const newMessage = await ChatMessage.create({
      chat: chatId,
      sender: userId,
      message: message.trim(),
    });

    await newMessage.populate('sender', 'name email role');

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: newMessage._id.toString(),
        _id: newMessage._id.toString(),
        chat: chatId,
        sender: newMessage.sender,
        message: newMessage.message,
        createdAt: newMessage.createdAt,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while sending message' });
  }
};

/**
 * GET /api/chats/my
 * List authorized department chats for the authenticated user:
 * - DEVELOPER:
 *   1. Find all active TeamMembership records: { user: req.user.userId, status: "ACTIVE" }
 *   2. For each active membership, ensure and return the unique department chat for:
 *      Chat.startup = membership.startup AND Chat.department = membership.department
 *   3. If belonging to multiple startups, return one authorized department chat per startup.
 *   4. Zero exposure to any other department chats.
 * - FOUNDER:
 *   1. Find all startups owned by the founder: { founder: req.user.userId }
 *   2. For each startup, return all department chats.
 */
const getMyChats = async (req, res) => {
  try {
    const userId = (req.user?.userId || req.user?.id || req.user?._id)?.toString();
    const userRole = (req.user?.role || '').toUpperCase();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (userRole === 'DEVELOPER') {
      const memberships = await TeamMembership.find({
        user: new mongoose.Types.ObjectId(userId),
        status: 'ACTIVE',
      })
        .populate('startup', 'name stage industry')
        .populate('department', 'name description isDefault')
        .sort({ createdAt: -1 });

      const chats = [];

      for (const m of memberships) {
        if (!m.startup || !m.department) continue;

        const sId = (m.startup._id || m.startup).toString();
        const dId = (m.department._id || m.department).toString();
        const deptName = m.department.name || 'Department';

        const chat = await ensureDepartmentChat(sId, dId, deptName);
        const messageCount = await ChatMessage.countDocuments({ chat: chat._id });
        const lastMessage = await ChatMessage.findOne({ chat: chat._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'name role');

        chats.push({
          id: chat._id.toString(),
          _id: chat._id.toString(),
          startup: {
            id: sId,
            _id: sId,
            name: m.startup.name,
            stage: m.startup.stage,
          },
          department: {
            id: dId,
            _id: dId,
            name: m.department.name,
            description: m.department.description || '',
            isDefault: m.department.isDefault,
          },
          name: chat.name,
          type: chat.type,
          messageCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage._id.toString(),
                sender: lastMessage.sender?.name || 'Team Member',
                message: lastMessage.message,
                createdAt: lastMessage.createdAt,
              }
            : null,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        });
      }

      return res.status(200).json({
        success: true,
        count: chats.length,
        chats,
        role: 'DEVELOPER',
      });
    }

    // FOUNDER: return all department chats across all owned startups
    const startups = await Startup.find({
      $or: [{ founder: userId }, { founderId: userId }],
    }).sort({ createdAt: -1 });

    const allChats = [];

    for (const s of startups) {
      const departments = await Department.find({ startup: s._id }).sort({ createdAt: 1 });
      for (const d of departments) {
        const chat = await ensureDepartmentChat(s._id.toString(), d._id.toString(), d.name);
        const messageCount = await ChatMessage.countDocuments({ chat: chat._id });
        const lastMessage = await ChatMessage.findOne({ chat: chat._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'name role');

        allChats.push({
          id: chat._id.toString(),
          _id: chat._id.toString(),
          startup: {
            id: s._id.toString(),
            _id: s._id.toString(),
            name: s.name,
            stage: s.stage,
          },
          department: {
            id: d._id.toString(),
            _id: d._id.toString(),
            name: d.name,
            description: d.description || '',
            isDefault: d.isDefault,
          },
          name: chat.name,
          type: chat.type,
          messageCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage._id.toString(),
                sender: lastMessage.sender?.name || 'Team Member',
                message: lastMessage.message,
                createdAt: lastMessage.createdAt,
              }
            : null,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: allChats.length,
      chats: allChats,
      role: 'FOUNDER',
    });
  } catch (error) {
    console.error('Error fetching my chats:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching my chats' });
  }
};

module.exports = {
  getMyChats,
  getStartupChats,
  getDepartmentChat,
  getChatMessages,
  sendMessage,
  ensureDepartmentChat,
};
