const router = require('express').Router();
const { list, search, getById, book, getBookings, cancelBooking } = require('../controllers/bookingSlotController');
router.get('/',         list);
router.get('/search',   search);
router.get('/bookings', getBookings);
router.get('/:id',      getById);
router.post('/book',    book);
router.post('/bookings/:id/cancel', cancelBooking);
module.exports = router;
