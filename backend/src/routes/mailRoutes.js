const express = require('express');
const mailController = require('../controllers/mailController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/summary', protect, mailController.getMailSummary);
router.get('/', protect, mailController.getInboxMails);
router.get('/:id', protect, mailController.getMailDetail);
router.post('/sync', protect, mailController.syncInbox);
router.post('/process', protect, mailController.processInbox);
router.post('/auto-reply', protect, mailController.autoReply);
router.post('/:id/process', protect, mailController.processMail);
router.post('/:id/reply', protect, mailController.replyMail);

module.exports = router;
