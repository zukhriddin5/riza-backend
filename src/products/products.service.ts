import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { slugify } from 'prisma/common/slugify';
import { localizeProduct, localizeCategory } from 'prisma/common/localize';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // categoryIds isn't a column — pull it out and turn it into a m-n connect.
    const { categoryIds, ...rest } = dto;
    const slug = await this.generateUniqueSlug(rest.name);
    return this.prisma.product.create({
      data: {
        ...rest,
        slug,
        ...(categoryIds?.length
          ? { categories: { connect: categoryIds.map((id) => ({ id })) } }
          : {}),
      },
      include: { categories: true },
    });
  }

  findAll() {
    // Include categories so the admin list can group by category (and the edit
    // form can preload a product's current categories). Deactivated (soft-deleted)
    // products are hidden so they read as "deleted" in the admin UI.
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: { categories: true },
    });
  }

  // Storefront listing: all active products, newest first, localized.
  async findActive(lang?: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => localizeProduct(p, lang));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async findBySlug(slug: string, lang?: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { categories: true },
    });
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return {
      ...localizeProduct(product, lang),
      categories: product.categories.map((c) => localizeCategory(c, lang)),
    };
  }

  async findByCategory(categorySlug: string, lang?: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, categories: { some: { slug: categorySlug } } },
    });
    return products.map((p) => localizeProduct(p, lang));
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { categoryIds, ...rest } = dto;

    const data: Prisma.ProductUpdateInput = { ...rest };
    // Renaming a product regenerates its slug (kept unique, ignoring itself).
    if (rest.name) {
      data.slug = await this.generateUniqueSlug(rest.name, id);
    }
    // If categoryIds was sent, replace the whole set of links.
    if (categoryIds) {
      data.categories = { set: categoryIds.map((cid) => ({ id: cid })) };
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: { categories: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      // Preferred: fully remove a product that has never been ordered.
      await this.prisma.product.delete({ where: { id } });
    } catch (e) {
      // Referenced by existing orders (FK P2003) → don't break order history.
      // Soft-delete instead: deactivate so it disappears from the shop AND the
      // admin list, while the row + order links stay intact. Standard practice.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        await this.prisma.product.update({ where: { id }, data: { isActive: false } });
        return;
      }
      throw e;
    }
  }

  // Slugs are server-owned and unique. Start from the name; if the slug is taken
  // by ANOTHER product, append -2, -3, … until it's free. excludeId lets an update
  // keep its own slug without colliding with itself.
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }
}