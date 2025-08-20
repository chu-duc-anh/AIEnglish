

import mongoose from 'mongoose';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { fullName, dob, gender, username, email, password } = req.body;

    if (!fullName || !dob || !gender || !username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(409).json({ message: `An account with the email '${email}' already exists.` });
    }
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
        return res.status(409).json({ message: `The username '${username}' is already taken.` });
    }
    
    // Check if any user already exists in the database
    const userExists = await User.findOne({}).lean();

    const user = await User.create({
      fullName,
      dob,
      gender,
      username,
      email,
      password,
      // If no user exists (userExists is null), make this new user an admin
      isAdmin: !userExists
    });

    if (user) {
      res.status(201).json({ message: "User registered successfully. Please login." });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
      console.error('Signup Error:', error);
      res.status(500).json({ message: 'Server error during user registration.' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

     if (!identifier || !password) {
        return res.status(400).json({ message: 'Username/Email and password are required.' });
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+password');

    if (user && (await user.matchPassword(password))) {
      // Lấy lại thông tin user không có password
      const userProfile = await User.findById(user._id);

      res.json({
        token: generateToken(user._id),
        user: userProfile,
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch(error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
export const getProfile = async (req, res) => {
  try {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ message: 'Server error while fetching profile.' });
  }
};

// @desc    Update user profile
// @route   PATCH /api/auth/me
// @access  Private
export const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.dob = req.body.dob || user.dob;
      user.gender = req.body.gender || user.gender;

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error while updating profile.' });
  }
};

// @desc    Change user password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide current and new passwords.' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        const user = await User.findById(req.user.id).select('+password');

        if (user && (await user.matchPassword(currentPassword))) {
            user.password = newPassword;
            await user.save();
            res.status(200).json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }

    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Server error while changing password.' });
    }
};

// @desc    Forgot password - generate token and send email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Per user request, return an error if the email doesn't exist.
      // This is less secure as it allows for email enumeration, but it's what was asked.
      return res.status(404).json({ message: 'No account with that email address exists.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Use environment variable for the frontend URL with a fallback for local development
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/#/reset-password/${resetToken}`;

    // --- Select image URL based on gender (Fixed swapped URLs) ---
    const maleImageUrl = 'https://i.imgur.com/rNTOOMm.jpeg'; 
    const femaleImageUrl = 'https://i.imgur.com/Kqkfd69.jpeg';
    const headerImageUrl = user.gender === 'male' ? maleImageUrl : femaleImageUrl;


    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <img src="${headerImageUrl}" alt="Header Image" style="width: 100%; height: auto; display: block;">
          <div style="padding: 24px; line-height: 1.6; color: #333;">
              <h2 style="color: #1e40af; text-align: center;">Password Reset</h2>
              <p style="font-size: 16px;">Hello ${user.fullName},</p>
              <p style="font-size: 16px;">You requested a password reset. Please click the button below to create a new password. This link is valid for 1 hour.</p>
              <div style="text-align: center; margin: 25px 0;">
                  <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Reset Your Password</a>
              </div>
              <p style="margin-top: 20px; font-size: 14px; color: #666;">If you did not request this, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; text-align: center; color: #999;">The AI English Assistant Team</p>
          </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.verify();
    console.log('✅ SMTP Server connection verified.');

    const mailOptions = {
        from: `AI English Assistant <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Your Password Reset Request',
        html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent successfully to ${user.email}`);
    
    // Changed the success message to be more explicit.
    res.status(200).json({ message: 'A password reset link has been sent to your email.' });

  } catch (error) {
    console.error('❌ Email Service Error:', error);
    // Changed the catch block to return a server error.
    res.status(500).json({ message: 'Server error. Could not send password reset email.' });
  }
};


// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error while resetting password.' });
    }
};


// --- Admin Functions ---

// @desc    Create a new user (by Admin)
// @route   POST /api/users
// @access  Private/Admin
export const createUserByAdmin = async (req, res) => {
    try {
        const { fullName, dob, gender, username, email, password, isAdmin } = req.body;

        if (!fullName || !dob || !gender || !username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(409).json({ message: 'A user with this email or username already exists.' });
        }

        const user = await User.create({
            fullName,
            dob,
            gender,
            username,
            email,
            password,
            isAdmin: isAdmin || false // Default to false if not provided
        });

        if (user) {
            // Don't send back the password
            const createdUserProfile = await User.findById(user._id);
            res.status(201).json(createdUserProfile);
        } else {
            res.status(400).json({ message: 'Invalid user data provided.' });
        }
    } catch (error) {
        console.error('Create User by Admin Error:', error);
        res.status(500).json({ message: 'Server error while creating user.' });
    }
};


// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

// @desc    Update user role to admin
// @route   PATCH /api/users/:id
// @access  Private/Admin
export const updateUserRole = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userToUpdate = await User.findById(req.params.id);

        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Safety check: an admin cannot change their own role via this endpoint.
        if (req.user.id === req.params.id) {
            return res.status(400).json({ message: 'Admins cannot change their own role.' });
        }

        userToUpdate.isAdmin = req.body.isAdmin;
        
        const updatedUser = await userToUpdate.save();
        
        res.json(updatedUser);

    } catch (error) {
        console.error('Update User Role Error:', error);
        res.status(500).json({ message: 'Server error while updating user role.' });
    }
};


// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ message: 'User not found' });
    }
      
    const user = await User.findById(req.params.id);

    if (user) {
      if(user.isAdmin) {
          return res.status(400).json({ message: 'Cannot delete an admin account.' });
      }
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch(error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: 'Server error while deleting user.' });
  }
};
