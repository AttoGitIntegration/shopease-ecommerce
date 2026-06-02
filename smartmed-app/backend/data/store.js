const fs = require('fs');
const path = require('path');

const medicines = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'medicines.json'), 'utf-8')
);

const users = new Map();
const carts = new Map();
const orders = new Map();
const prescriptions = new Map();

module.exports = {
  medicines,
  users,
  carts,
  orders,
  prescriptions,
};
