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
import { getJobs, addJob, updateJobStatus, updateJobDetails, deleteJob, seedUserExamples } from '../lib/actions';

type Job = {
  id: string;
  company: string;
  role: string;
  status: string;
  salary?: string;
  url?: string;
  notes?: string;
};

const COLUMNS = ['Saved', 'Applied', 'Interviewing', 'Offer'] as const;

function JobCard({ job, onDelete, onSelect }: { job: Job; onDelete: (id: string) => void; onSelect: (job: Job) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: job.id });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const isExample = job.company.includes('(Example)');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(job)}
      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex justify-between items-start group"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">{job.role}</h3>
          {isExample && (
            <span className="text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/60">
              Example
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{job.company}</p>
        {job.salary && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{job.salary}</p>}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition text-sm font-bold opacity-0 group-hover:opacity-100 p-1"
      >
        ✕
      </button>
    </div>
  );
}

function Column({ title, jobs, onDeleteJob, onSelectJob }: { title: string; jobs: Job[]; onDeleteJob: (id: string) => void; onSelectJob: (job: Job) => void }) {
  const { setNodeRef } = useDroppable({ id: title });

  return (
    <div ref={setNodeRef} className="bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">{title}</h2>
        <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-2.5 py-0.5 rounded-full text-xs shadow-xs">
          {jobs.length}
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onDelete={onDeleteJob} onSelect={onSelectJob} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [mounted, setMounted] = useState(false);

  // Auth State
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [authError, setAuthError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setMounted(true);
    const sessionUser = localStorage.getItem('jobtrackr_session');
    const storedTheme = localStorage.getItem('jobtrackr_theme');
    
    if (storedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

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

  const toggleDarkMode = () => {
    const nextTheme = !darkMode;
    setDarkMode(nextTheme);
    
    if (nextTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('jobtrackr_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('jobtrackr_theme', 'light');
    }
  };

  const exportToCSV = () => {
    const headers = ['Company', 'Role', 'Status', 'Salary', 'URL', 'Notes'];
    const rows = jobs.map((j) => [
      `"${j.company}"`,
      `"${j.role}"`,
      `"${j.status}"`,
      `"${j.salary || ''}"`,
      `"${j.url || ''}"`,
      `"${j.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jobtrackr_applications.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as string;

    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job)));
    await updateJobStatus(jobId, newStatus);
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUser = currentUser || localStorage.getItem('jobtrackr_session');
    if (!company || !role || !activeUser) return;

    const createdJob = await addJob(company, role, activeUser);
    if (createdJob) {
      setJobs((prev) => [createdJob as Job, ...prev]);
    }
    setCompany('');
    setRole('');
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    await updateJobDetails(selectedJob.id, {
      salary: selectedJob.salary,
      url: selectedJob.url,
      notes: selectedJob.notes,
    });

    setJobs((prev) => prev.map((j) => (j.id === selectedJob.id ? selectedJob : j)));
    setSelectedJob(null);
  };

  const handleDeleteJob = async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await deleteJob(id);
  };

  if (!mounted) return null;

  const filteredJobs = jobs.filter(
    (j) => j.company.toLowerCase().includes(search.toLowerCase()) || j.role.toLowerCase().includes(search.toLowerCase())
  );

  const total = jobs.length;
  const interviewing = jobs.filter((j) => j.status === 'Interviewing').length;
  const offers = jobs.filter((j) => j.status === 'Offer').length;
  const conversionRate = total > 0 ? Math.round(((interviewing + offers) / total) * 100) : 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">JobTrackr</h1>
            <p className="text-slate-500 text-sm mt-2">{isSignUp ? 'Create your account' : 'Sign in to manage your applications'}</p>
          </div>

          {authError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl text-center">{authError}</div>}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Email</label>
              <input type="email" required placeholder="alex@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Password</label>
              <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm mt-2">{isSignUp ? 'Create Account' : 'Sign In'}</button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-10 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">JobTrackr</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Logged in as <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser}</span></p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={exportToCSV} className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition">Export CSV</button>
            <button onClick={toggleDarkMode} className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition">{darkMode ? '☀️ Light' : '🌙 Dark'}</button>
            <button onClick={handleLogout} className="px-3.5 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold rounded-xl text-xs transition">Sign Out</button>
          </div>
        </div>

        {/* Analytics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Applications</p>
            <p className="text-2xl font-black mt-1">{total}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Interviews</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{interviewing}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Offers Received</p>
            <p className="text-2xl font-black text-emerald-500 mt-1">{offers}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Response Rate</p>
            <p className="text-2xl font-black text-indigo-500 mt-1">{conversionRate}%</p>
          </div>
        </div>

        {/* Search & Add Inputs */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 mb-8 flex flex-col md:flex-row gap-3">
          <input type="text" placeholder="🔍 Search applications..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm" />
          <div className="flex flex-1 gap-3">
            <input type="text" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm" />
            <input type="text" placeholder="Role Title" value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm" />
            <button onClick={handleAddJob} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shrink-0">Add</button>
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {COLUMNS.map((columnTitle) => (
              <Column key={columnTitle} title={columnTitle} jobs={filteredJobs.filter((j) => j.status === columnTitle)} onDeleteJob={handleDeleteJob} onSelectJob={setSelectedJob} />
            ))}
          </div>
        </DndContext>
      </div>

      {/* Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 rounded-2xl shadow-2xl">
            <h2 className="text-xl font-bold mb-1">{selectedJob.role}</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{selectedJob.company}</p>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Salary Range</label>
                <input type="text" placeholder="$120,000" value={selectedJob.salary || ''} onChange={(e) => setSelectedJob({ ...selectedJob, salary: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Job Post URL</label>
                <input type="url" placeholder="https://..." value={selectedJob.url || ''} onChange={(e) => setSelectedJob({ ...selectedJob, url: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Notes</label>
                <textarea rows={3} placeholder="Recruiter contact, interview dates..." value={selectedJob.notes || ''} onChange={(e) => setSelectedJob({ ...selectedJob, notes: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setSelectedJob(null)} className="px-4 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}