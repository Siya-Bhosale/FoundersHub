const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');

/**
 * Middleware to enforce strict role-based startup workspace access:
 * - FOUNDER: Allowed if they own the startup.
 * - DEVELOPER: Allowed if an ACTIVE TeamMembership exists for this startup.
 * - Otherwise: 403 Forbidden.
 */
const requireStartupAccess = async (req, res, next) => {
  try {
    const startupId = req.params.startupId || req.params.id;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID',
      });
    }

    const userId = (req.user?.userId || req.user?.id || req.user?._id)?.toString();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    const userRole = (req.user?.role || '').toUpperCase();
    const founderId = (startup.founder?._id || startup.founder || startup.founderId)?.toString();

    // 1. Founder check: must be role FOUNDER and own the startup
    if (userRole === 'FOUNDER') {
      if (founderId === userId) {
        req.startup = startup;
        req.isFounder = true;
        req.membership = null;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have ownership access to this startup workspace',
      });
    }

    // 2. Developer check: must have ACTIVE TeamMembership for this startup
    if (userRole === 'DEVELOPER') {
      const membership = await TeamMembership.findOne({
        startup: startup._id,
        user: new mongoose.Types.ObjectId(userId),
        status: 'ACTIVE',
      }).populate('department', 'name description isDefault');

      if (membership) {
        req.startup = startup;
        req.isFounder = false;
        req.membership = membership;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have active membership access to this startup workspace',
      });
    }

    // 3. Other roles (e.g. INVESTOR)
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Access denied to internal startup workspace',
    });
  } catch (error) {
    console.error('requireStartupAccess middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error verifying startup workspace access',
    });
  }
};

module.exports = {
  requireStartupAccess,
};
