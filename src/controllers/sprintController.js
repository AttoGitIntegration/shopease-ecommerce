const VALID_STATUSES = ['planned', 'active', 'completed', 'cancelled'];
const VALID_GENERATION_TYPES = ['tasks', 'reports', 'burndown', 'standup_summary', 'backlog_items'];

const sprints = [];
const generations = [];

const findSprint = (id) =>
  sprints.find(s => s.sprintId === id || String(s.id) === String(id));

const recordEvent = (sprint, event, details = {}) => {
  sprint.history.push({ event, at: new Date(), ...details });
};

const isSprintWindowOpen = (sprint, now = Date.now()) => {
  const start = new Date(sprint.startDate).getTime();
  const end = new Date(sprint.endDate).getTime();
  return now >= start && now <= end;
};

exports.createSprint = (req, res) => {
  const { name, startDate, endDate, goal, capacity } = req.body || {};

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, startDate and endDate required' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'startDate and endDate must be valid dates' });
  }
  if (end.getTime() <= start.getTime()) {
    return res.status(400).json({ error: 'endDate must be after startDate' });
  }
  if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 0)) {
    return res.status(400).json({ error: 'capacity must be a non-negative number' });
  }

  const sprint = {
    id: sprints.length + 1,
    sprintId: `SPR-${Date.now()}-${sprints.length + 1}`,
    name,
    goal: goal || null,
    capacity: capacity ?? null,
    startDate: start,
    endDate: end,
    status: 'planned',
    activatedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    generationCount: 0,
    lastGeneratedAt: null,
    createdAt: new Date(),
    history: []
  };
  recordEvent(sprint, 'created', { name, startDate: start, endDate: end });
  sprints.push(sprint);
  res.status(201).json({ message: 'Sprint created', sprint });
};

exports.listSprints = (req, res) => {
  const { status } = req.query || {};
  let filtered = sprints;
  if (status) filtered = filtered.filter(s => s.status === status);
  res.json({ sprints: filtered, total: filtered.length });
};

exports.getSprint = (req, res) => {
  const sprint = findSprint(req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  res.json(sprint);
};

exports.activateSprint = (req, res) => {
  const sprint = findSprint(req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  if (sprint.status !== 'planned') {
    return res.status(400).json({ error: `Cannot activate sprint in ${sprint.status} state` });
  }
  const conflict = sprints.find(s => s.status === 'active');
  if (conflict) {
    return res.status(409).json({
      error: 'Another sprint is already active',
      activeSprintId: conflict.sprintId
    });
  }
  if (!isSprintWindowOpen(sprint)) {
    return res.status(400).json({ error: 'Sprint cannot be activated outside its scheduled window' });
  }
  sprint.status = 'active';
  sprint.activatedAt = new Date();
  recordEvent(sprint, 'activated');
  res.json({ message: 'Sprint activated', sprint });
};

exports.completeSprint = (req, res) => {
  const sprint = findSprint(req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  if (sprint.status !== 'active') {
    return res.status(400).json({ error: `Cannot complete sprint in ${sprint.status} state` });
  }
  sprint.status = 'completed';
  sprint.completedAt = new Date();
  recordEvent(sprint, 'completed');
  res.json({ message: 'Sprint completed', sprint });
};

exports.cancelSprint = (req, res) => {
  const sprint = findSprint(req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  if (['completed', 'cancelled'].includes(sprint.status)) {
    return res.status(400).json({ error: `Cannot cancel sprint in ${sprint.status} state` });
  }
  sprint.status = 'cancelled';
  sprint.cancelledAt = new Date();
  sprint.cancellationReason = req.body?.reason || 'No reason provided';
  recordEvent(sprint, 'cancelled', { reason: sprint.cancellationReason });
  res.json({ message: 'Sprint cancelled', sprint });
};

exports.triggerGeneration = (req, res) => {
  const sprint = findSprint(req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

  if (sprint.status !== 'active') {
    return res.status(409).json({
      error: 'Generation can only be executed when the sprint is active',
      sprintId: sprint.sprintId,
      currentStatus: sprint.status
    });
  }

  if (!isSprintWindowOpen(sprint)) {
    return res.status(409).json({
      error: 'Sprint window has elapsed; generation cannot run',
      sprintId: sprint.sprintId,
      startDate: sprint.startDate,
      endDate: sprint.endDate
    });
  }

  const { type, payload, triggeredBy } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type required' });
  if (!VALID_GENERATION_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of ${VALID_GENERATION_TYPES.join(', ')}` });
  }

  const generation = {
    id: generations.length + 1,
    generationId: `GEN-${Date.now()}-${generations.length + 1}`,
    sprintId: sprint.sprintId,
    type,
    payload: payload || null,
    triggeredBy: triggeredBy || null,
    triggeredAt: new Date(),
    status: 'executed',
    sprintStatusAtTrigger: sprint.status
  };
  generations.push(generation);

  sprint.generationCount += 1;
  sprint.lastGeneratedAt = generation.triggeredAt;
  recordEvent(sprint, 'generation_executed', {
    generationId: generation.generationId,
    type,
    triggeredBy: generation.triggeredBy
  });

  res.status(201).json({ message: 'Generation executed', generation });
};

exports.listGenerations = (req, res) => {
  const sprint = findSprint(req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  const items = generations.filter(g => g.sprintId === sprint.sprintId);
  res.json({ sprintId: sprint.sprintId, generations: items, total: items.length });
};

exports.getSprintHistory = (req, res) => {
  const sprint = findSprint(req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  res.json({ sprintId: sprint.sprintId, status: sprint.status, history: sprint.history });
};

exports._reset = () => {
  sprints.length = 0;
  generations.length = 0;
};
