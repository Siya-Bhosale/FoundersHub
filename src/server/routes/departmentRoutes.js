const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getStartupDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');

// Routes mounted when routed via /api/departments
router.get('/startup/:startupId', authMiddleware, getStartupDepartments);

// Routes mounted when routed via /api/startups or /api/departments
router.get('/:startupId/departments', authMiddleware, getStartupDepartments);
router.get('/:startupId/departments/:departmentId', authMiddleware, getDepartmentById);
router.post('/:startupId/departments', authMiddleware, requireRole('FOUNDER'), createDepartment);
router.put('/:startupId/departments/:departmentId', authMiddleware, requireRole('FOUNDER'), updateDepartment);
router.delete('/:startupId/departments/:departmentId', authMiddleware, requireRole('FOUNDER'), deleteDepartment);

// Direct single department route
router.get('/:departmentId', authMiddleware, getDepartmentById);

module.exports = router;

