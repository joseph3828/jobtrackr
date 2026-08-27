import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.job.deleteMany(); // Clear existing demo data

  await prisma.job.createMany({
    data: [
      { company: 'Google (Example)', role: 'Frontend Engineer', status: 'Saved' },
      { company: 'Stripe (Example)', role: 'Full Stack Developer', status: 'Applied' },
      { company: 'Netflix (Example)', role: 'UI/UX Engineer', status: 'Interviewing' },
      { company: 'Apple (Example)', role: 'Software Engineer', status: 'Offer' },
    ],
  });

  console.log('✅ Successfully seeded example jobs into Neon DB!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());