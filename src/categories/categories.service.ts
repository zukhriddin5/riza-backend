import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from 'prisma/common/slugify';
import { localizeProduct, localizeCategory } from 'prisma/common/localize';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin-only: create a category. Name must be unique; slug is server-generated
  // and de-duped. New categories immediately show up on the home feed and in the
  // product form's category picker (both read from here).
  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const nameRu = dto.nameRu.trim();

    const existing = await this.prisma.category.findUnique({ where: { name } });
    if (existing) throw new ConflictException('A category with that name already exists');

    const slug = await this.generateUniqueSlug(name);
    return this.prisma.category.create({
      data: { name, nameRu, slug },
      include: { _count: { select: { products: true } } },
    });
  }

  // Admin-only: rename a category. Keeps the name unique and regenerates the slug.
  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.prisma.category.findUnique({ where: { name } });
      if (clash && clash.id !== id) {
        throw new ConflictException('A category with that name already exists');
      }
      data.name = name;
      data.slug = await this.generateUniqueSlug(name, id);
    }
    if (dto.nameRu !== undefined) {
      data.nameRu = dto.nameRu.trim();
    }

    return this.prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });
  }

  // Admin-only: delete a category. The implicit many-to-many join rows are removed
  // automatically; the products themselves are NOT deleted — they just lose this tag.
  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.category.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  // List all categories, each with a COUNT of how many products it holds.
  // _count is Prisma's built-in way to count related records without loading them.
  findAll() {
    return this.prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
  // Everything the home page needs, in ONE query round-trip:
  //  - `newProducts`: the newest products across the whole store
  //  - `categories`: every category, each WITH its products included
  async homeFeed(lang?: string) {
    // Run both DB reads in parallel with Promise.all — faster than awaiting one then the other.
    const [newProducts, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },      // hide deactivated products
        orderBy: { createdAt: 'desc' }, // newest first
        take: 8,                        // cap the "New Products" row
      }),
      this.prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
          // include each category's ACTIVE products (via the many-to-many relation)
          products: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    // Localize product + category names to the requested language.
    return {
      newProducts: newProducts.map((p) => localizeProduct(p, lang)),
      categories: categories.map((c) => ({
        ...localizeCategory(c, lang),
        products: c.products.map((p) => localizeProduct(p, lang)),
      })),
    };
  }

  // Storefront: one category by slug + its active products (newest first),
  // all localized. Powers the "view all products in this category" page.
  async findBySlug(slug: string, lang?: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        products: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!category) throw new NotFoundException(`Category "${slug}" not found`);
    return {
      ...localizeCategory(category, lang),
      products: category.products.map((p) => localizeProduct(p, lang)),
    };
  }

  // slugify the name, then append -2, -3, … if that slug is taken by ANOTHER
  // category. excludeId lets a rename keep its own slug without self-colliding.
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.category.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }
}