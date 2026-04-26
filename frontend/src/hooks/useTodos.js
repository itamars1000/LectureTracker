import { useState, useEffect, useCallback } from 'react';
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
 */
export function useTodos(userId) {
  const [todos, setTodos] = useState([]);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadTodos = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('loadTodos error:', error);
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
  }, [userId]);

  useEffect(() => {
    if (userId) loadTodos();
    else setTodos([]);
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

  return { todos, addTodo, toggleTodo, deleteTodo };
}
