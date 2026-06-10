const router = require('express').Router();
const {
  requestOtp, login, logout,
  getHistory,
  getVisits, getVisitById,
  getPrescriptions,
  getLabReports,
  getVaccinations,
  getAllergies,
  getConditions,
  getAccessLog
} = require('../controllers/medicalHistoryController');

router.post('/otp',           requestOtp);
router.post('/login',         login);
router.post('/logout',        logout);

router.get('/',               getHistory);
router.get('/visits',         getVisits);
router.get('/visits/:id',     getVisitById);
router.get('/prescriptions',  getPrescriptions);
router.get('/lab-reports',    getLabReports);
router.get('/vaccinations',   getVaccinations);
router.get('/allergies',      getAllergies);
router.get('/conditions',     getConditions);
router.get('/access-log',     getAccessLog);

module.exports = router;
