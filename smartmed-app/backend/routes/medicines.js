const router = require('express').Router();
const {
  listMedicines,
  getMedicine,
  listCategories,
} = require('../controllers/medicineController');

router.get('/', listMedicines);
router.get('/categories', listCategories);
router.get('/:id', getMedicine);

module.exports = router;
