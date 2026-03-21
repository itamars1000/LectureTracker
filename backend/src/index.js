const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Courses ──────────────────────────────────────────────────────────────────

app.get('/api/courses', async (req, res) => {
  const courses = await prisma.course.findMany({
    include: { sessions: true },
    orderBy: { createdAt: 'desc' },
  });

  const result = courses.map((c) => {
    const total = c.sessions.length;
    const watched = c.sessions.filter((s) => s.watched).length;
    return { ...c, total, watched };
  });

  res.json(result);
});

app.post('/api/courses', async (req, res) => {
  const { name, totalWeeks = 13, weeklyLectures, weeklyTutorials } = req.body;

  if (!name || weeklyLectures == null || weeklyTutorials == null) {
    return res.status(400).json({ error: 'שדות חובה חסרים' });
  }

  // Generate sessions
  const sessions = [];
  for (let week = 1; week <= totalWeeks; week++) {
    for (let i = 1; i <= weeklyLectures; i++) {
      sessions.push({ week, type: 'lecture', number: i });
    }
    for (let i = 1; i <= weeklyTutorials; i++) {
      sessions.push({ week, type: 'tutorial', number: i });
    }
  }

  const course = await prisma.course.create({
    data: {
      name,
      totalWeeks,
      weeklyLectures,
      weeklyTutorials,
      sessions: { create: sessions },
    },
    include: { sessions: true },
  });

  const total = course.sessions.length;
  res.status(201).json({ ...course, total, watched: 0 });
});

app.delete('/api/courses/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await prisma.course.delete({ where: { id } });
  res.json({ ok: true });
});

// ── Sessions ─────────────────────────────────────────────────────────────────

app.get('/api/courses/:id/sessions', async (req, res) => {
  const courseId = parseInt(req.params.id);
  const sessions = await prisma.session.findMany({
    where: { courseId },
    orderBy: [{ week: 'asc' }, { type: 'asc' }, { number: 'asc' }],
  });
  res.json(sessions);
});

app.patch('/api/sessions/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { watched } = req.body;
  const session = await prisma.session.update({
    where: { id },
    data: { watched },
  });
  res.json(session);
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
