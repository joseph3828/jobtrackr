'use server';

import { prisma } from './prisma';
import { revalidatePath } from 'next/cache';

export async function getJobs(userId: string) {
  try {
    return await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return [];
  }
}

export async function seedUserExamples(userId: string) {
  try {
    const count = await prisma.job.count({ where: { userId } });
    if (count === 0) {
      await prisma.job.createMany({
        data: [
          { userId, company: 'Google (Example)', role: 'Frontend Engineer', status: 'Saved', salary: '$140,000', notes: 'Referred by senior dev on LinkedIn' },
          { userId, company: 'Stripe (Example)', role: 'Full Stack Developer', status: 'Applied', salary: '$160,000', url: 'https://stripe.com/jobs' },
          { userId, company: 'Netflix (Example)', role: 'UI/UX Engineer', status: 'Interviewing', notes: 'Technical round scheduled for next Tuesday' },
          { userId, company: 'Apple (Example)', role: 'Software Engineer', status: 'Offer', salary: '$175,000' },
        ],
      });
    }
  } catch (error) {
    console.error('Failed to seed user examples:', error);
  }
}

export async function addJob(company: string, role: string, userId: string, salary?: string, url?: string, notes?: string) {
  try {
    const newJob = await prisma.job.create({
      data: { company, role, status: 'Saved', userId, salary: salary || '', url: url || '', notes: notes || '' },
    });
    revalidatePath('/');
    return newJob;
  } catch (error) {
    console.error('Failed to add job:', error);
  }
}

export async function updateJobDetails(id: string, data: { status?: string; salary?: string; url?: string; notes?: string }) {
  try {
    const updated = await prisma.job.update({ where: { id }, data });
    revalidatePath('/');
    return updated;
  } catch (error) {
    console.error('Failed to update job:', error);
  }
}

export async function updateJobStatus(id: string, status: string) {
  try {
    const updated = await prisma.job.update({ where: { id }, data: { status } });
    revalidatePath('/');
    return updated;
  } catch (error) {
    console.error('Failed to update status:', error);
  }
}

export async function deleteJob(id: string) {
  try {
    await prisma.job.delete({ where: { id } });
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete job:', error);
  }
}