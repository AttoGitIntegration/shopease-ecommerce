const router = require('express').Router();
const {
  login, logout,
  getPatient, searchPatients,
  searchDrugs,
  createDraft, addLine, removeLine, preview,
  issue, deliver, cancel, amend, refill,
  list, getById, auditLog, verify
} = require('../controllers/prescriptionController');

router.post('/login',             login);
router.post('/logout',            logout);

router.get('/patients/search',    searchPatients);
router.get('/patients/:id',       getPatient);

router.get('/drugs/search',       searchDrugs);

router.post('/',                  createDraft);
router.get('/',                   list);

router.get('/:id/preview',        preview);
router.get('/:id/audit',          auditLog);
router.get('/:id/verify',         verify);
router.get('/:id',                getById);

router.post('/:id/lines',         addLine);
router.delete('/:id/lines/:lineId', removeLine);

router.post('/:id/issue',         issue);
router.post('/:id/deliver',       deliver);
router.post('/:id/cancel',        cancel);
router.post('/:id/amend',         amend);
router.post('/:id/refill',        refill);

module.exports = router;
