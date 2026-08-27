'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  useSensors,
  useSensor,
  PointerSensor,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { getJobs, addJob, updateJobStatus, deleteJob, seedUserExamples } from '../lib/actions';

type Job = {
  id: string;
  company: string;
  role: string;
  status: string;
};

const COLUMNS = ['Saved', 'Applied', 'Interviewing', 'Offer'] as const;

function JobCard({ job, onDelete }: { job: Job; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: job.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const isExample = job.company.includes('(Example)');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex justify-between items-start group"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-slate-900">{job.role}</h3>
          {isExample && (
            <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200/60">
              Example
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-slate-500">{job.company}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="text-slate-300 hover:text-red-500 transition text-sm font-bold opacity-0 group-hover:opacity-100 p-1"
      >
        ✕
      </button>
    </div>
  );
}

function Column({
  title,
  jobs,
  onDeleteJob,
}: {
  title: string;
  jobs: Job[];
  onDeleteJob: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: title });

  return (
    <div ref={setNodeRef} className="bg-slate-100/70 border border-slate-200/60 p-4 rounded-2xl min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-bold text-slate-800 text-sm tracking-wide uppercase">
          {title}
        </h2>
        <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full text-xs shadow-xs">
          {jobs.length}
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onDelete={onDeleteJob} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [mounted, setMounted] = useState(false);

  // Auth State
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [authError, setAuthError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    setMounted(true);
    const sessionUser = localStorage.getItem('jobtrackr_session');
    if (sessionUser) {
      setCurrentUser(sessionUser);
      setIsAuthenticated(true);
      loadData(sessionUser);
    }
  }, []);

  async function loadData(userEmail: string) {
    const data = await getJobs(userEmail);
    setJobs(data as Job[]);
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const storedUsers = JSON.parse(localStorage.getItem('jobtrackr_users') || '{}');

    if (isSignUp) {
      if (storedUsers[email]) {
        setAuthError('An account with this email already exists.');
        return;
      }
      storedUsers[email] = password;
      localStorage.setItem('jobtrackr_users', JSON.stringify(storedUsers));
      localStorage.setItem('jobtrackr_session', email);
      setCurrentUser(email);
      setIsAuthenticated(true);

      // Seed example jobs for the new user
      await seedUserExamples(email);
      await loadData(email);
    } else {
      if (!storedUsers[email] || storedUsers[email] !== password) {
        setAuthError('Invalid email or password.');
        return;
      }
      localStorage.setItem('jobtrackr_session', email);
      setCurrentUser(email);
      setIsAuthenticated(true);
      await loadData(email);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jobtrackr_session');
    setIsAuthenticated(false);
    setCurrentUser('');
    setEmail('');
    setPassword('');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as string;

    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
    );

    await updateJobStatus(jobId, newStatus);
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role || !currentUser) return;

    const createdJob = await addJob(company, role, currentUser);
    if (createdJob) {
      setJobs((prev) => [createdJob as Job, ...prev]);
    }
    setCompany('');
    setRole('');
  };

  const handleDeleteJob = async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await deleteJob(id);
  };

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">JobTrackr</h1>
            <p className="text-slate-500 text-sm mt-2">
              {isSignUp ? 'Create your new account' : 'Sign in to manage your applications'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all text-sm mt-2"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError('');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">JobTrackr</h1>
            <p className="text-slate-500 text-sm mt-1">
              Logged in as <span className="font-semibold text-slate-800">{currentUser}</span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="self-start md:self-auto px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-xl text-sm transition"
          >
            Sign Out
          </button>
        </div>

        <form onSubmit={handleAddJob} className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 mb-8 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Company Name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
          />
          <input
            type="text"
            placeholder="Role Title"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition text-sm"
          >
            Add Application
          </button>
        </form>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {COLUMNS.map((columnTitle) => (
              <Column
                key={columnTitle}
                title={columnTitle}
                jobs={jobs.filter((j) => j.status === columnTitle)}
                onDeleteJob={handleDeleteJob}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}