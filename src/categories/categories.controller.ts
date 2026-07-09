import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post() // POST /categories — ADMIN only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get() // GET /categories
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('home-feed') // GET /categories/home-feed?lang=uz|ru
  homeFeed(@Query('lang') lang?: string) {
    return this.categoriesService.homeFeed(lang);
  }

  // GET /categories/:slug?lang=uz|ru — one category + its products (storefront).
  // Declared after the literal 'home-feed' route so it isn't captured here.
  @Get(':slug')
  findBySlug(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this.categoriesService.findBySlug(slug, lang);
  }

  @Patch(':id') // PATCH /categories/:id — ADMIN only: rename
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id') // DELETE /categories/:id — ADMIN only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}