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
import { getJobs, addJob, updateJobStatus, deleteJob } from '../lib/actions';type Job = {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white p-4 rounded shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing flex justify-between items-start group"
    >
      <div>
        <h3 className="font-semibold text-slate-900">{job.role}</h3>
        <p className="text-sm text-slate-500">{job.company}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="text-slate-400 hover:text-red-500 transition text-sm font-bold opacity-0 group-hover:opacity-100"
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
    <div ref={setNodeRef} className="bg-slate-100 p-4 rounded-lg min-h-[400px] flex flex-col">
      <h2 className="font-semibold text-slate-700 mb-4 flex justify-between">
        {title}
        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-sm">
          {jobs.length}
        </span>
      </h2>

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Prevent hydration mismatch for dnd-kit & load Neon DB data on mount
  useEffect(() => {
    setMounted(true);
    async function loadData() {
      const data = await getJobs();
      setJobs(data as Job[]);
    }
    loadData();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as string;

    // Optimistic UI update
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
    );

    // Persist status change to Neon PostgreSQL
    await updateJobStatus(jobId, newStatus);
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role) return;

    const createdJob = await addJob(company, role);
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">JobTrackr</h1>

      <form onSubmit={handleAddJob} className="mb-8 flex gap-3">
        <input
          type="text"
          placeholder="Company Name"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Role Title"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition"
        >
          Add Job
        </button>
      </form>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
  );
}