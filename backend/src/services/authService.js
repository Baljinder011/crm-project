const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { ApiError } = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/sendEmail');
const {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPassword,
} = require('../models/userModel');
const {
  createPasswordResetToken,
  invalidateActivePasswordResetTokens,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
} = require('../models/passwordResetModel');

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

async function registerUser({ name, email, password }) {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({ name, email, passwordHash });
  const token = signToken({ userId: user.id, email: user.email });

  return { user: sanitizeUser(user), token };
}

async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'Your account is inactive. Contact admin.');
  }

  const token = signToken({ userId: user.id, email: user.email });
  return { user: sanitizeUser(user), token };
}

async function getProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }
  return sanitizeUser(user);
}

async function forgotPassword({ email }) {
  const user = await findUserByEmail(email);

  if (!user) {
    return {
      message: 'If this email exists, a password reset link has been sent.',
    };
  }

  await invalidateActivePasswordResetTokens(user.id);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const subject = 'Reset your CRM password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>Hello ${user.name},</p>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">
          Reset Password
        </a>
      </p>
      <p>This link will expire in 30 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html, fallbackText: `Reset your password: ${resetUrl}` });

  return {
    message: 'If this email exists, a password reset link has been sent.',
  };
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resetRow = await findValidPasswordResetToken(tokenHash);

  if (!resetRow) {
    throw new ApiError(400, 'Reset token is invalid or expired.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updateUserPassword(resetRow.user_id, passwordHash);
  await markPasswordResetTokenUsed(resetRow.id);
  await invalidateActivePasswordResetTokens(resetRow.user_id);

  return {
    message: 'Password has been reset successfully.',
  };
}

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  resetPassword,
};