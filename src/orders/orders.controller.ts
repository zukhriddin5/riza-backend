import { Body, Controller, Get, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard) // applied to the whole controller — all routes require auth
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post() // POST /orders — checkout
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateOrderDto) {
    // userId comes from the verified token, NOT the request body.
    return this.ordersService.create(user.id, dto);
  }

  @Get() // GET /orders — ADMIN only: every order, newest first
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('mine') // GET /orders/mine — my order history
  findMine(@CurrentUser() user: { id: string }) {
    return this.ordersService.findMyOrders(user.id);
  }

  @Patch(':id/deliver') // PATCH /orders/:id/deliver — ADMIN only (CASH → also PAID)
  @UseGuards(RolesGuard) // JwtAuthGuard already applies at the class level
  @Roles('ADMIN') // ...and now ADMIN-only
  markDelivered(@Param('id') id: string) {
    return this.ordersService.markDelivered(id);
  }

  @Patch(':id/pay') // PATCH /orders/:id/pay — ADMIN only: mark payment received
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  markPaid(@Param('id') id: string) {
    return this.ordersService.markPaid(id);
  }
  @Get('payment-info')
  paymentInfo() {
    return {
      telegram: process.env.ADMIN_TELEGRAM,
      cardNumber: process.env.ADMIN_CARD_NUMBER,
    };
  }
  @Delete(':id')  // DELETE /orders/:id  — cancel my order
   cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
  return this.ordersService.cancel(user.id, id);
}
}

