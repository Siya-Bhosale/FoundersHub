const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const roles = allowedRoles.flat().map((r) => r.toUpperCase());
    const userRole = (req.user.role || '').toUpperCase();
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient role permissions',
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
};
