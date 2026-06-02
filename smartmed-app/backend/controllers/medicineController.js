const { medicines } = require('../data/store');

function listMedicines(req, res) {
  const { q, category, prescriptionRequired } = req.query;
  let results = medicines;

  if (q) {
    const needle = q.toString().toLowerCase();
    results = results.filter(
      (m) =>
        m.name.toLowerCase().includes(needle) ||
        m.description.toLowerCase().includes(needle) ||
        m.manufacturer.toLowerCase().includes(needle)
    );
  }

  if (category) {
    results = results.filter(
      (m) => m.category.toLowerCase() === category.toString().toLowerCase()
    );
  }

  if (prescriptionRequired !== undefined) {
    const wantRx = prescriptionRequired === 'true';
    results = results.filter((m) => m.prescriptionRequired === wantRx);
  }

  res.json({ count: results.length, items: results });
}

function getMedicine(req, res) {
  const medicine = medicines.find((m) => m.id === req.params.id);
  if (!medicine) {
    return res.status(404).json({ error: 'Medicine not found' });
  }
  res.json(medicine);
}

function listCategories(req, res) {
  const categories = [...new Set(medicines.map((m) => m.category))].sort();
  res.json(categories);
}

module.exports = { listMedicines, getMedicine, listCategories };
