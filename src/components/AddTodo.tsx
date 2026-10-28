"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

/** Add your own to-do: what to do and, if it has one, when it's due. */
export function AddTodo() {
  const { update } = useStore();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update((d) => { (d.myTodos ??= []).push({ id: `m${Date.now().toString(36)}`, title: title.trim(), due: due || null, done: false }); });
    setTitle(""); setDue("");
  };
  return (
    <form className="addtodo" id="add-todo" onSubmit={add}>
      <input aria-label="New to-do" placeholder="Add a to-do, e.g. Call the Florida GM" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input aria-label="Due date (optional)" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <button className="btn" type="submit" disabled={!title.trim()}>+ Add</button>
    </form>
  );
}
