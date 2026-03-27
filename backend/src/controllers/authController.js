const {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  resetPassword,
} = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || String(name).trim().length < 2) {
    throw new ApiError(400, 'Name must be at least 2 characters long.');
  }

  if (!validateEmail(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  if (!password || String(password).length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  const data = await registerUser({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    password: String(password),
  });

  res.status(201).json({ success: true, message: 'User registered successfully.', ...data });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!validateEmail(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  if (!password) {
    throw new ApiError(400, 'Password is required.');
  }

  const data = await loginUser({
    email: String(email).trim().toLowerCase(),
    password: String(password),
  });

  res.status(200).json({ success: true, message: 'Login successful.', ...data });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await getProfile(req.user.userId);
  res.status(200).json({ success: true, user });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!validateEmail(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  const data = await forgotPassword({ email: String(email).trim().toLowerCase() });
  res.status(200).json({ success: true, ...data });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token) {
    throw new ApiError(400, 'Reset token is required.');
  }

  if (!newPassword || String(newPassword).length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long.');
  }

  const data = await resetPassword({ token: String(token), newPassword: String(newPassword) });
  res.status(200).json({ success: true, ...data });
});