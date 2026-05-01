import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import AppDataSource from './data-source';
import { Concert } from './entities/Concert';
import { Ticket } from './entities/Ticket';

config();

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const concertRepo = AppDataSource.getRepository(Concert);
  const ticketRepo = AppDataSource.getRepository(Ticket);

  const existing = await concertRepo.count();
  if (existing > 0) {
    await AppDataSource.destroy();
    return;
  }

  const samples: Array<{
    title: string;
    venue: string;
    startsAt: Date;
    totalStock: number;
    price: number;
    type: 'VIP' | 'NORMAL';
  }> = [
    {
      title: 'Sample Concert - Acoustic Night',
      venue: 'Main Hall',
      startsAt: daysFromNow(7),
      totalStock: 120,
      price: 2500,
      type: 'NORMAL',
    },
    {
      title: 'Sample Concert - Rock Festival',
      venue: 'Outdoor Stage',
      startsAt: daysFromNow(14),
      totalStock: 300,
      price: 4500,
      type: 'VIP',
    },
    {
      title: 'Sample Concert - Jazz Evening',
      venue: 'City Theater',
      startsAt: daysFromNow(21),
      totalStock: 80,
      price: 3500,
      type: 'NORMAL',
    },
    {
      title: 'Sample Concert - Pop Live',
      venue: 'Arena A',
      startsAt: daysFromNow(30),
      totalStock: 500,
      price: 5000,
      type: 'VIP',
    },
  ];

  for (const sample of samples) {
    const concertId = randomUUID();
    const concert = concertRepo.create({
      id: concertId,
      title: sample.title,
      venue: sample.venue,
      startsAt: sample.startsAt,
    });
    await concertRepo.save(concert);

    const ticket = ticketRepo.create({
      id: randomUUID(),
      concertId,
      totalStock: sample.totalStock,
      remainingStock: sample.totalStock,
      price: sample.price,
      type: sample.type,
    });
    await ticketRepo.save(ticket);
  }

  await AppDataSource.destroy();
}

seed().catch((err: unknown) => {
  console.error('Seed failed', err);
  process.exitCode = 1;
});
