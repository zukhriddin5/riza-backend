import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post() // ADMIN only: create a product
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // GET /products/all?lang=uz|ru — full storefront listing (active, newest first).
  // Declared before :id so "all" isn't captured as an id.
  @Get('all')
  findActive(@Query('lang') lang?: string) {
    return this.productsService.findActive(lang);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id') // ADMIN only: edit a product
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id') // ADMIN only: delete a product
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }


  // GET /products/slug/:slug?lang=uz|ru  — the detail-page lookup
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this.productsService.findBySlug(slug, lang);
  }

  // GET /products/category/:categorySlug?lang=uz|ru  — browse a category
  @Get('category/:categorySlug')
  findByCategory(@Param('categorySlug') categorySlug: string, @Query('lang') lang?: string) {
    return this.productsService.findByCategory(categorySlug, lang);
  }
}
