import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export function useCourses(userId) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tracks whether the initial fetch has completed at least once.
  // Used to suppress the loading skeleton on realtime / error-recovery reloads —
  // those should be silent background refreshes, not full skeleton flashes.
  const hasLoaded = useRef(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadCourses = useCallback(async () => {
    if (!userId) return;

    // Only show the skeleton on the very first load (or after a logout reset).
    if (!hasLoaded.current) setIsLoading(true);

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
      setIsLoading(false);
      return;
    }

    setCourses((cRows ?? []).map((c) => assembleCourse(c, sRows ?? [])));
    hasLoaded.current = true;
    setIsLoading(false);
  }, [userId]);

  // ── Initial load + cleanup on logout ───────────────────────────────────────

  useEffect(() => {
    if (userId) {
      loadCourses();
    } else {
      setCourses([]);
      setIsLoading(false);
      hasLoaded.current = false; // next login will show skeleton again
    }
  }, [userId, loadCourses]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  // Listens for any INSERT / UPDATE / DELETE on the courses and sessions tables
  // for this user. When a change arrives (e.g. from another tab or device),
  // re-fetches data silently — no skeleton, no flicker.

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`courses-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `user_id=eq.${userId}`,
        },
        () => loadCourses(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${userId}`,
        },
        () => loadCourses(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, loadCourses]);

  // ── Create ──────────────────────────────────────────────────────────────────

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

  // ── Update (edit) ───────────────────────────────────────────────────────────

  const updateCourse = async (courseId, formData) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const structureChanged =
      formData.totalWeeks !== course.totalWeeks ||
      formData.weeklyLectures !== course.weeklyLectures ||
      formData.weeklyTutorials !== course.weeklyTutorials;

    if (structureChanged) {
      const newSessions = generateSessions(
        courseId,
        formData.totalWeeks,
        formData.weeklyLectures,
        formData.weeklyTutorials,
      );

      setCourses((prev) =>
        prev.map((c) =>
          c.id !== courseId
            ? c
            : {
                ...c,
                name: formData.name,
                totalWeeks: formData.totalWeeks,
                weeklyLectures: formData.weeklyLectures,
                weeklyTutorials: formData.weeklyTutorials,
                sessions: newSessions,
                total: newSessions.length,
                watched: 0,
              },
        ),
      );

      const { error: updateErr } = await supabase
        .from('courses')
        .update({
          name: formData.name,
          total_weeks: formData.totalWeeks,
          weekly_lectures: formData.weeklyLectures,
          weekly_tutorials: formData.weeklyTutorials,
        })
        .eq('id', courseId);

      if (updateErr) { loadCourses(); throw updateErr; }

      await supabase.from('sessions').delete().eq('course_id', courseId);

      const { error: insErr } = await supabase.from('sessions').insert(
        newSessions.map((s) => ({
          id: s.id,
          user_id: userId,
          course_id: courseId,
          week: s.week,
          type: s.type,
          number: s.number,
          watched: false,
        })),
      );

      if (insErr) { loadCourses(); throw insErr; }
    } else {
      setCourses((prev) =>
        prev.map((c) => (c.id !== courseId ? c : { ...c, name: formData.name })),
      );

      const { error } = await supabase
        .from('courses')
        .update({ name: formData.name })
        .eq('id', courseId);

      if (error) { loadCourses(); throw error; }
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

  /**
   * Deletes a session and renumbers subsequent sessions of the same type
   * so the numbering stays contiguous (no gaps).
   * Example: deleting lecture 2 of [1,2,3,4] → [1,2,3]
   */
  const deleteSession = async (sessionId) => {
    // Find the session and its parent course before touching state.
    let deleted = null;
    let parentCourseId = null;
    for (const c of courses) {
      const s = c.sessions.find((s) => s.id === sessionId);
      if (s) { deleted = s; parentCourseId = c.id; break; }
    }
    if (!deleted) return;

    // Sessions of the same type that come after the deleted one need renumbering.
    const toRenumber = courses
      .find((c) => c.id === parentCourseId)
      ?.sessions.filter((s) => s.type === deleted.type && s.number > deleted.number) ?? [];

    // Optimistic: remove session + decrement numbers of affected sessions.
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== parentCourseId) return c;
        const sessions = c.sessions
          .filter((s) => s.id !== sessionId)
          .map((s) =>
            s.type === deleted.type && s.number > deleted.number
              ? { ...s, number: s.number - 1 }
              : s,
          );
        return {
          ...c,
          sessions,
          total: sessions.length,
          watched: sessions.filter((s) => s.watched).length,
        };
      }),
    );

    // DB: delete the session.
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) {
      console.error('deleteSession error:', error);
      loadCourses();
      return;
    }

    // DB: renumber the affected sessions.
    if (toRenumber.length > 0) {
      await Promise.all(
        toRenumber.map((s) =>
          supabase.from('sessions').update({ number: s.number - 1 }).eq('id', s.id),
        ),
      );
    }
  };

  // ── Add extra session ───────────────────────────────────────────────────────

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

    const typeSessions = course.sessions
      .filter((s) => s.type === type)
      .map((s) => ({ ...s }));
    typeSessions.push(newSession);
    typeSessions.sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
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
    isLoading,
    createCourse,
    updateCourse,
    deleteCourse,
    toggleSession,
    deleteSession,
    addExtraSession,
  };
}
