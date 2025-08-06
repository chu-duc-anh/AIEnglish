
import express from 'express';
const router = express.Router();
import {
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
} from '../controllers/conversationController.js';
import { protect } from '../middleware/authMiddleware.js';

// Tất cả các route trong file này đều được bảo vệ
router.use(protect);

router.route('/').post(createConversation).get(getConversations);
router
  .route('/:id')
  .get(getConversationById)
  .patch(updateConversation)
  .delete(deleteConversation);

export default router;
