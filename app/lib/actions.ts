'use server';

import { prisma } from './prisma';
import { revalidatePath } from 'next/cache';

export async function getJobs() {
  try {
    return await prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return [];
  }
}

export async function addJob(company: string, role: string) {
  try {
    const newJob = await prisma.job.create({
      data: {
        company,
        role,
        status: 'Saved',
      },
    });
    revalidatePath('/');
    return newJob;
  } catch (error) {
    console.error('Failed to add job:', error);
  }
}

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