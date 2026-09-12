const router = require('express').Router();
const {
  createSprint,
  listSprints,
  getSprint,
  activateSprint,
  completeSprint,
  cancelSprint,
  triggerGeneration,
  listGenerations,
  getSprintHistory
} = require('../controllers/sprintController');

router.post('/',                    createSprint);
router.get('/',                     listSprints);
router.get('/:id/history',          getSprintHistory);
router.get('/:id/generations',      listGenerations);
router.get('/:id',                  getSprint);
router.put('/:id/activate',         activateSprint);
router.put('/:id/complete',         completeSprint);
router.put('/:id/cancel',           cancelSprint);
router.post('/:id/generate',        triggerGeneration);

module.exports = router;
