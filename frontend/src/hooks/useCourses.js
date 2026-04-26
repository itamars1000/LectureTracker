import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds the flat session list for a new course before it reaches the DB.
 * Session numbers are continuous across all weeks per type (not reset per week).
 */
function generateSessions(courseId, totalWeeks, weeklyLectures, weeklyTutorials) {
  const sessions = [];
  let lectureNum = 1;
  let tutorialNum = 1;
  for (let week = 1; week <= totalWeeks; week++) {
    for (let i = 0; i < weeklyLectures; i++) {
      sessions.push({
        id: crypto.randomUUID(),
        courseId,
        week,
        type: 'lecture',
        number: lectureNum++,
        watched: false,
      });
    }
    for (let i = 0; i < weeklyTutorials; i++) {
      sessions.push({
        id: crypto.randomUUID(),
        courseId,
        week,
        type: 'tutorial',
        number: tutorialNum++,
        watched: false,
      });
    }
  }
  return sessions;
}

/** Maps a DB row pair (course + its sessions) to the camelCase in-memory shape. */
function assembleCourse(c, sRows) {
  const sessions = sRows
    .filter((s) => s.course_id === c.id)
    .map((s) => ({
      id: s.id,
      courseId: s.course_id,
      week: s.week,
      type: s.type,
      number: s.number,
      watched: s.watched,
    }));
  return {
    id: c.id,
    name: c.name,
    totalWeeks: c.total_weeks,
    weeklyLectures: c.weekly_lectures,
    weeklyTutorials: c.weekly_tutorials,
    createdAt: c.created_at,
    sessions,
    total: sessions.length,
    watched: sessions.filter((s) => s.watched).length,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Manages the courses + sessions state for the authenticated user.
 *
 * @param {string | null | undefined} userId  – from session?.user?.id
 *
 * Auto-loads on mount when userId is truthy.
 * Auto-clears when userId becomes falsy (logout).
 *
 * All mutations follow optimistic update → DB write → revert on error.
 */
export function useCourses(userId) {
  const [courses, setCourses] = useState([]);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadCourses = useCallback(async () => {
    if (!userId) return;
    const [
      { data: cRows, error: cErr },
      { data: sRows, error: sErr },
    ] = await Promise.all([
      supabase
        .from('courses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').eq('user_id', userId),
    ]);

    if (cErr || sErr) {
      console.error('loadCourses error:', cErr ?? sErr);
      return;
    }

    setCourses((cRows ?? []).map((c) => assembleCourse(c, sRows ?? [])));
  }, [userId]);

  useEffect(() => {
    if (userId) loadCourses();
    else setCourses([]);
  }, [userId, loadCourses]);

  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Creates a new course + all its sessions.
   * Throws on DB error so the caller (CourseWizard) can show an error message.
   */
  const createCourse = async (formData) => {
    const courseId = crypto.randomUUID();
    const sessions = generateSessions(
      courseId,
      formData.totalWeeks,
      formData.weeklyLectures,
      formData.weeklyTutorials,
    );
    const createdAt = new Date().toISOString();

    const newCourse = {
      id: courseId,
      name: formData.name,
      totalWeeks: formData.totalWeeks,
      weeklyLectures: formData.weeklyLectures,
      weeklyTutorials: formData.weeklyTutorials,
      createdAt,
      sessions,
      total: sessions.length,
      watched: 0,
    };

    // Optimistic
    setCourses((prev) => [newCourse, ...prev]);

    const { error: cErr } = await supabase.from('courses').insert({
      id: courseId,
      user_id: userId,
      name: formData.name,
      total_weeks: formData.totalWeeks,
      weekly_lectures: formData.weeklyLectures,
      weekly_tutorials: formData.weeklyTutorials,
      created_at: createdAt,
    });

    if (cErr) {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      throw cErr;
    }

    const { error: sErr } = await supabase.from('sessions').insert(
      sessions.map((s) => ({
        id: s.id,
        user_id: userId,
        course_id: courseId,
        week: s.week,
        type: s.type,
        number: s.number,
        watched: false,
      })),
    );

    if (sErr) {
      await supabase.from('courses').delete().eq('id', courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      throw sErr;
    }
  };

  // ── Delete course ───────────────────────────────────────────────────────────

  const deleteCourse = async (id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      console.error('deleteCourse error:', error);
      loadCourses();
    }
  };

  // ── Toggle session watched ──────────────────────────────────────────────────

  const toggleSession = async (sessionId, watched) => {
    setCourses((prev) =>
      prev.map((c) => {
        const idx = c.sessions.findIndex((s) => s.id === sessionId);
        if (idx === -1) return c;
        const sessions = c.sessions.map((s) =>
          s.id === sessionId ? { ...s, watched } : s,
        );
        return { ...c, sessions, watched: sessions.filter((s) => s.watched).length };
      }),
    );

    const { error } = await supabase
      .from('sessions')
      .update({ watched })
      .eq('id', sessionId);

    if (error) {
      console.error('toggleSession error:', error);
      // Revert
      setCourses((prev) =>
        prev.map((c) => {
          const idx = c.sessions.findIndex((s) => s.id === sessionId);
          if (idx === -1) return c;
          const sessions = c.sessions.map((s) =>
            s.id === sessionId ? { ...s, watched: !watched } : s,
          );
          return { ...c, sessions, watched: sessions.filter((s) => s.watched).length };
        }),
      );
    }
  };

  // ── Delete session ──────────────────────────────────────────────────────────

  const deleteSession = async (sessionId) => {
    setCourses((prev) =>
      prev.map((c) => {
        const sessions = c.sessions.filter((s) => s.id !== sessionId);
        if (sessions.length === c.sessions.length) return c;
        return {
          ...c,
          sessions,
          total: sessions.length,
          watched: sessions.filter((s) => s.watched).length,
        };
      }),
    );
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) {
      console.error('deleteSession error:', error);
      loadCourses();
    }
  };

  // ── Add extra session ───────────────────────────────────────────────────────

  /**
   * Inserts an extra session for a given course/week/type and renumbers
   * the other sessions of the same type so they remain contiguous.
   */
  const addExtraSession = async (courseId, week, type) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const newSession = {
      id: crypto.randomUUID(),
      courseId,
      week: Number(week),
      type,
      watched: false,
      number: 0,
    };

    // Build new ordering for this type
    const typeSessions = course.sessions
      .filter((s) => s.type === type)
      .map((s) => ({ ...s }));
    typeSessions.push(newSession);
    typeSessions.sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      // New session goes last within its week
      const aNum = a.id === newSession.id ? Infinity : a.number;
      const bNum = b.id === newSession.id ? Infinity : b.number;
      return aNum - bNum;
    });

    const sessionsToUpdateInDb = [];
    typeSessions.forEach((s, idx) => {
      const newNum = idx + 1;
      if (s.id === newSession.id) {
        newSession.number = newNum;
      } else if (s.number !== newNum) {
        sessionsToUpdateInDb.push({ id: s.id, number: newNum });
      }
    });

    // Optimistic
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const updatedSessions = c.sessions.map((oldS) => {
          const changed = sessionsToUpdateInDb.find((u) => u.id === oldS.id);
          return changed ? { ...oldS, number: changed.number } : oldS;
        });
        updatedSessions.push(newSession);
        return { ...c, sessions: updatedSessions, total: updatedSessions.length };
      }),
    );

    const { error: insErr } = await supabase.from('sessions').insert({
      id: newSession.id,
      user_id: userId,
      course_id: courseId,
      week: newSession.week,
      type: newSession.type,
      number: newSession.number,
      watched: false,
    });

    if (insErr) {
      console.error('addExtraSession error:', insErr);
      loadCourses();
      return;
    }

    if (sessionsToUpdateInDb.length > 0) {
      await Promise.all(
        sessionsToUpdateInDb.map((u) =>
          supabase.from('sessions').update({ number: u.number }).eq('id', u.id),
        ),
      );
    }
  };

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    courses,
    createCourse,
    deleteCourse,
    toggleSession,
    deleteSession,
    addExtraSession,
  };
}
