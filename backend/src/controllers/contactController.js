const { asyncHandler } = require('../utils/asyncHandler');
const { getAllContacts } = require('../models/contactModel');

exports.getContacts = asyncHandler(async (_req, res) => {
  const contacts = await getAllContacts();

  res.status(200).json({
    success: true,
    contacts,
  });
});