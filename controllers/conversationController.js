import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';

// @desc    Create new conversation
// @route   POST /api/conversations
// @access  Private
export const createConversation = async (req, res) => {
  try {
    const { assistantName, gender, scenario } = req.body;

    // Tin nhắn chào mừng ban đầu từ AI
    const starterMessage = {
        id: `starter-0`,
        sender: 'ai',
        text: `Hello! I'm ${assistantName}. Let's start our ${scenario} practice. What would you like to talk about?`,
        translation: `Xin chào! Tôi là ${assistantName}. Hãy bắt đầu buổi luyện tập về ${scenario}. Bạn muốn nói về điều gì?`
    };

    const conversation = new Conversation({
      userId: req.user._id,
      title: `${assistantName} - ${scenario.charAt(0).toUpperCase() + scenario.slice(1)} Practice`,
      assistantName,
      gender,
      scenario,
      messages: [starterMessage]
    });

    const createdConversation = await conversation.save();
    res.status(201).json(createdConversation);
  } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ message: 'Server error while creating conversation.' });
  }
};

// @desc    Get all conversations for a user
// @route   GET /api/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Server error while fetching conversations.' });
  }
};

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
export const getConversationById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ message: 'Conversation not found' });
    }
    // Perform find and authorization in a single atomic query
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });

    if (conversation) {
      res.json(conversation);
    } else {
      // Return 404 for security; don't reveal that the resource exists but belongs to another user
      return res.status(404).json({ message: 'Conversation not found' });
    }

  } catch (error) {
    console.error('Error fetching conversation by ID:', error);
    res.status(500).json({ message: 'Server error while fetching conversation.' });
  }
};

// @desc    Update a conversation
// @route   PATCH /api/conversations/:id
// @access  Private
export const updateConversation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ message: 'Conversation not found' });
    }

    const { messages, title } = req.body;
    
    // Atomically find the conversation belonging to the user and update it
    const conversation = await Conversation.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { $set: { messages, title } },
        { new: true } // Return the updated document
    );

    if (conversation) {
      res.json(conversation);
    } else {
      res.status(404).json({ message: 'Conversation not found' });
    }

  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ message: 'Server error while updating conversation.' });
  }
};

// @desc    Delete a conversation
// @route   DELETE /api/conversations/:id
// @access  Private
export const deleteConversation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ message: 'Conversation not found' });
    }

    // Atomically find the conversation belonging to the user and delete it
    const result = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (result) {
      res.status(204).send(); // 204 No Content
    } else {
      // If nothing was deleted, it's because it wasn't found or didn't belong to the user
      res.status(404).json({ message: 'Conversation not found' });
    }

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ message: 'Server error while deleting conversation.' });
  }
};
