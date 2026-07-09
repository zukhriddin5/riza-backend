import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, PaymentMethod } from 'generated/prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    // 1) Load real products — server owns prices.
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });

    // 2) Build lines from trusted data + stock check.
    const lines = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Not enough stock for ${product.name}`);
      }
      return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity };
    });

    // 3) Totals — shipping computed on the SERVER.
    const itemsTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const threshold = Number(process.env.FREE_SHIPPING_THRESHOLD ?? 50000);
    const fee = Number(process.env.SHIPPING_FEE ?? 5000);
    const shipping = itemsTotal >= threshold ? 0 : fee;
    const tax = 0;
    const total = itemsTotal + shipping + tax;

    // 4) Everything in one transaction: save address, create order+items, decrement stock.
    return this.prisma.$transaction(async (tx) => {
      // save the address to the user's account for reuse
      const address = await tx.address.create({
        data: { userId, ...dto.address },
      });

      const order = await tx.order.create({
        data: {
          userId,
          addressId: address.id,
          shipFullName: dto.address.fullName,
          shipStreet: dto.address.street,
          shipCity: dto.address.city,
          shipPhone: dto.address.phone,
          shipCountry: dto.address.country,
          paymentMethod: dto.paymentMethod,
          itemsTotal,
          shipping,
          tax,
          total,
          items: { create: lines },
        },
        include: { items: true },
      });

      for (const line of lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
        });
      }

      return order;
    });
  }

  // ...keep findMyOrders and markDelivered as they were
  // A user's own orders, newest first.
  findMyOrders(userId: string) {
    return this.prisma.order.findMany({
        where: {
            userId,
            status: { not: OrderStatus.CANCELLED }, // hide cancelled from the customer
    },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
  });
}


  // Admin: every order, newest first, with line items, the buyer's email, and the
  // snapshotted ship* fields (which are plain columns on Order, so no include needed).
  findAll() {
    return this.prisma.order.findMany({
      include: {
        items: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin: mark an order delivered (ADMIN-only route).
  // Cash orders are paid on delivery — delivering a CASH order also settles payment.
  async markDelivered(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.DELIVERED,
        // Cash is collected at the door, so delivery == payment for CASH orders.
        ...(order.paymentMethod === PaymentMethod.CASH
          ? { paymentStatus: PaymentStatus.PAID }
          : {}),
      },
    });
  }

  // Admin: mark an order's payment as received (e.g. a card transfer confirmed).
  async markPaid(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return this.prisma.order.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.PAID },
    });
  }
  async cancel(userId: string, orderId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new NotFoundException('Order not found');

  // Ownership check: users can only cancel THEIR OWN orders.
  if (order.userId !== userId) {
    throw new ForbiddenException('Not your order');
  }

  // Business rule: only PENDING orders can be cancelled.
  if (order.status !== OrderStatus.PENDING) {
    throw new BadRequestException('Only pending orders can be cancelled');
  }

  // Restore stock + mark cancelled, atomically.
  return this.prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }, // put stock BACK
      });
    }
    return tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
  });
}
}

