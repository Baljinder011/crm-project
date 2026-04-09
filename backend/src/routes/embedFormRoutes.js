const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const controller = require('../controllers/embedFormController');

const router = express.Router();

router.get('/forms/:publicKey/script.js', controller.getScript);
router.post('/forms/:publicKey/submit', controller.submitFromScript);

router.get('/admin/forms', protect, controller.listForms);
router.post('/admin/forms', protect, controller.createForm);
router.get('/admin/forms/:id/snippet', protect, controller.getSnippet);

module.exports = router;