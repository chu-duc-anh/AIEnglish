import express from 'express';
const router = express.Router();
import {
  signup,
  login,
  getProfile,
  getAllUsers,
  deleteUser,
  createUserByAdmin,
  updateUserRole,
  updateMyProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Auth routes
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.get('/auth/me', protect, getProfile);
router.patch('/auth/me', protect, updateMyProfile);
router.post('/auth/change-password', protect, changePassword);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// User management routes (admin only)
router.route('/users')
  .post(protect, admin, createUserByAdmin) // Create a user
  .get(protect, admin, getAllUsers); // Get all users

router.route('/users/:id')
  .delete(protect, admin, deleteUser) // Delete a user
  .patch(protect, admin, updateUserRole); // Update a user's role

export default router;