'use server';

import { prisma } from './prisma';
import { revalidatePath } from 'next/cache';

// Fetch ONLY jobs belonging to the logged-in user
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

// Create example jobs automatically when a new user registers
export async function seedUserExamples(userId: string) {
  try {
    const count = await prisma.job.count({ where: { userId } });
    if (count === 0) {
      await prisma.job.createMany({
        data: [
          { userId, company: 'Google (Example)', role: 'Frontend Engineer', status: 'Saved' },
          { userId, company: 'Stripe (Example)', role: 'Full Stack Developer', status: 'Applied' },
          { userId, company: 'Netflix (Example)', role: 'UI/UX Engineer', status: 'Interviewing' },
          { userId, company: 'Apple (Example)', role: 'Software Engineer', status: 'Offer' },
        ],
      });
    }
  } catch (error) {
    console.error('Failed to seed user examples:', error);
  }
}

// Add a job tied to the logged-in user
export async function addJob(company: string, role: string, userId: string) {
  try {
    const newJob = await prisma.job.create({
      data: {
        company,
        role,
        status: 'Saved',
        userId,
      },
    });
    revalidatePath('/');
    return newJob;
  } catch (error) {
    console.error('Failed to add job:', error);
  }
}

// Update job status
export async function updateJobStatus(id: string, status: string) {
  try {
    const updated = await prisma.job.update({
      where: { id },
      data: { status },
    });
    revalidatePath('/');
    return updated;
  } catch (error) {
    console.error('Failed to update job status:', error);
  }
}

// Delete job
export async function deleteJob(id: string) {
  try {
    await prisma.job.delete({
      where: { id },
    });
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete job:', error);
  }
}