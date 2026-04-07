const express = require('express');
const contactController = require('../controllers/contactController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, contactController.getContacts);
router.get('/:id', protect, contactController.getContactDetail);
router.post('/enrich-all', protect, contactController.enrichAllContacts);
router.post('/:id/enrich', protect, contactController.enrichContact);
router.patch('/:id/pipeline', protect, contactController.updatePipeline);

module.exports = router;
