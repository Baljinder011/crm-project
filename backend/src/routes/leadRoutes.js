const express = require('express');
const leadController = require('../controllers/leadController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, leadController.getLeads);
router.get('/:id', protect, leadController.getLeadDetail);
router.post('/enrich-all', protect, leadController.enrichAllLeads);
router.post('/:id/enrich', protect, leadController.enrichLead);

module.exports = router;