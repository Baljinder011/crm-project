const express = require('express');
const contactController = require('../controllers/contactController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// support both styles:
// module.exports = protect
// or module.exports = { protect }
const protect =
  typeof authMiddleware === 'function'
    ? authMiddleware
    : authMiddleware.protect;

if (typeof protect !== 'function') {
  throw new TypeError(
    'auth middleware "protect" is not a function. Check src/middlewares/authMiddleware.js exports.'
  );
}

if (typeof contactController.getContacts !== 'function') {
  throw new TypeError('contactController.getContacts is not a function');
}

if (typeof contactController.getContactDetail !== 'function') {
  throw new TypeError('contactController.getContactDetail is not a function');
}

if (typeof contactController.getContactAiEvents !== 'function') {
  throw new TypeError('contactController.getContactAiEvents is not a function');
}

if (typeof contactController.enrichAllContacts !== 'function') {
  throw new TypeError('contactController.enrichAllContacts is not a function');
}

if (typeof contactController.enrichContact !== 'function') {
  throw new TypeError('contactController.enrichContact is not a function');
}

if (typeof contactController.updatePipeline !== 'function') {
  throw new TypeError('contactController.updatePipeline is not a function');
}

router.get('/', protect, contactController.getContacts);
router.get('/:id', protect, contactController.getContactDetail);
router.get('/:id/ai-events', protect, contactController.getContactAiEvents);
router.post('/enrich-all', protect, contactController.enrichAllContacts);
router.post('/:id/enrich', protect, contactController.enrichContact);
router.patch('/:id/pipeline', protect, contactController.updatePipeline);

module.exports = router;