import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';
import { slugify } from './common/slugify';

// Same connection setup as your PrismaService — a standalone client for seeding.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Wipe first so re-running gives a clean, known state every time.
  // Products go first; the join rows to categories clear automatically.
  console.log('Clearing old data...');
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  console.log('Creating categories...');
  for (const name of ['Sofa', 'Door', 'Bedroom', 'Kitchen']) {
    await prisma.category.create({ data: { name, slug: slugify(name) } });
  }

  console.log('Creating products...');
  const products = [
    { name: 'Cloud Linen Sofa',   description: 'Three-seat sofa in soft linen',  price: 59999,  stock: 12, rating: 4.5, img: 'sofa1',      cats: ['Sofa'] },
    { name: 'Modular Sectional',  description: 'L-shaped modular sectional',      price: 129999, stock: 5,  rating: 4.6, img: 'sectional',  cats: ['Sofa'] },
    { name: 'Accent Armchair',    description: 'Cozy accent chair',               price: 39999,  stock: 20, rating: 4.4, img: 'armchair',   cats: ['Sofa', 'Bedroom'] }, // in TWO categories
    { name: 'Oak Panel Door',     description: 'Solid oak interior door',         price: 34999,  stock: 15, rating: 4.7, img: 'door1',      cats: ['Door'] },
    { name: 'Sliding Glass Door', description: 'Frosted sliding glass door',      price: 74999,  stock: 8,  rating: 4.3, img: 'door2',      cats: ['Door'] },
    { name: 'Kingsize Bed Frame', description: 'Upholstered king bed frame',      price: 89999,  stock: 10, rating: 4.8, img: 'bed1',       cats: ['Bedroom'] },
    { name: 'Bedside Nightstand', description: 'Two-drawer nightstand',           price: 14999,  stock: 25, rating: 4.2, img: 'nightstand', cats: ['Bedroom'] },
    { name: 'Kitchen Island',     description: 'Butcher-block kitchen island',    price: 99999,  stock: 6,  rating: 4.6, img: 'kitchen1',   cats: ['Kitchen'] },
    { name: 'Bar Stool Set',      description: 'Set of two bar stools',           price: 19999,  stock: 30, rating: 4.1, img: 'stool',      cats: ['Kitchen'] },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        description: p.description,
        price: p.price,
        stock: p.stock,
        rating: p.rating,
        imageUrl: `https://picsum.photos/seed/${p.img}/400/300`,
        // connect: link this product to existing categories by their unique slug.
        categories: { connect: p.cats.map((c) => ({ slug: slugify(c) })) },
      },
    });
  }

  console.log('Seed complete ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect()); // always close the connection