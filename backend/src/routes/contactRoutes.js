const express = require('express');
const contactController = require('../controllers/contactController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, contactController.getContacts);

module.exports = router;