const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getStartupDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');

router.get('/:startupId/departments', authMiddleware, getStartupDepartments);
router.post('/:startupId/departments', authMiddleware, requireRole('FOUNDER'), createDepartment);
router.put('/:startupId/departments/:departmentId', authMiddleware, requireRole('FOUNDER'), updateDepartment);
router.delete('/:startupId/departments/:departmentId', authMiddleware, requireRole('FOUNDER'), deleteDepartment);

module.exports = router;
