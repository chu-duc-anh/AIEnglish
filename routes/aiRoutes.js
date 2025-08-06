

import express from 'express';
import { getAiChatResponse, getSentenceSuggestions, generateRandomSentence, getTopicSuggestion } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// This route is protected, ensuring only logged-in users can access the AI features.
router.post('/chat', protect, getAiChatResponse);
router.post('/suggestions', protect, getSentenceSuggestions);
router.post('/topic-suggestion', protect, getTopicSuggestion);
router.post('/random-sentence', protect, generateRandomSentence);


export default router;
