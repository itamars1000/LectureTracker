import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Manages the todos state for the authenticated user.
 *
 * @param {string | null | undefined} userId  – from session?.user?.id
 *
 * Auto-loads on mount when userId is truthy.
 * Auto-clears when userId becomes falsy (logout).
 *
 * All mutations follow optimistic update → DB write → revert on error.
 *
 * Returns isLoading: true until the first successful fetch completes.
 * Subscribes to Supabase Realtime so changes from other tabs/devices
 * are reflected automatically without a page refresh.
 */
export function useTodos(userId) {
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tracks whether the initial fetch has completed at least once.
  // Realtime-triggered reloads are silent — no skeleton flash.
  const hasLoaded = useRef(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadTodos = useCallback(async () => {
    if (!userId) return;

    if (!hasLoaded.current) setIsLoading(true);

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('loadTodos error:', error);
      setIsLoading(false);
      return;
    }

    setTodos(
      (data ?? []).map((t) => ({
        id: t.id,
        description: t.description,
        linkedCourseId: t.linked_course_id,
        linkedWeek: t.linked_week,
        done: t.done,
        createdAt: t.created_at,
      })),
    );
    hasLoaded.current = true;
    setIsLoading(false);
  }, [userId]);

  // ── Initial load + cleanup on logout ───────────────────────────────────────

  useEffect(() => {
    if (userId) {
      loadTodos();
    } else {
      setTodos([]);
      setIsLoading(false);
      hasLoaded.current = false;
    }
  }, [userId, loadTodos]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  // Listens for any INSERT / UPDATE / DELETE on the todos table for this user.
  // When a change arrives from another tab or device, re-fetches silently.

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`todos-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${userId}`,
        },
        () => loadTodos(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, loadTodos]);

  // ── Add ─────────────────────────────────────────────────────────────────────

  const addTodo = async ({ description, linkedCourseId, linkedWeek }) => {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const courseId = linkedCourseId || null;

    // Optimistic
    setTodos((prev) => [
      ...prev,
      {
        id,
        description,
        linkedCourseId: courseId,
        linkedWeek: linkedWeek ?? null,
        done: false,
        createdAt,
      },
    ]);

    const { error } = await supabase.from('todos').insert({
      id,
      user_id: userId,
      description,
      linked_course_id: courseId,
      linked_week: linkedWeek ?? null,
      done: false,
      created_at: createdAt,
    });

    if (error) {
      console.error('addTodo error:', error);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // ── Toggle ──────────────────────────────────────────────────────────────────

  const toggleTodo = async (id, done) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));

    const { error } = await supabase.from('todos').update({ done }).eq('id', id);
    if (error) {
      console.error('toggleTodo error:', error);
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !done } : t)));
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const deleteTodo = async (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      console.error('deleteTodo error:', error);
      loadTodos();
    }
  };

  // ── Return ──────────────────────────────────────────────────────────────────

  return { todos, isLoading, addTodo, toggleTodo, deleteTodo };
}
