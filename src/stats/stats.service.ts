import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { OrderStatus, PaymentStatus, Role } from 'generated/prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  // One call that powers the whole admin dashboard.
  // "Revenue" = money actually received → only PAID orders count.
  async dashboard() {
    const [revenueAgg, totalOrders, totalCustomers, pendingOrders, paidOrders, topRaw, recentOrders] =
      await Promise.all([
        // Total revenue: sum of totals across PAID orders (cents).
        this.prisma.order.aggregate({
          where: { paymentStatus: PaymentStatus.PAID },
          _sum: { total: true },
        }),
        // Total orders placed (exclude cancelled — they didn't really happen).
        this.prisma.order.count({ where: { status: { not: OrderStatus.CANCELLED } } }),
        // Customer count.
        this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
        // Orders still awaiting fulfilment.
        this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
        // Paid orders' dates + totals — bucketed into months below.
        this.prisma.order.findMany({
          where: { paymentStatus: PaymentStatus.PAID },
          select: { createdAt: true, total: true },
        }),
        // Best sellers by quantity sold, across PAID orders only.
        this.prisma.orderItem.groupBy({
          by: ['name'],
          where: { order: { paymentStatus: PaymentStatus.PAID } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        // Latest 5 orders for the dashboard preview.
        this.prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { items: true, user: { select: { email: true } } },
        }),
      ]);

    return {
      totalRevenue: revenueAgg._sum.total ?? 0,
      totalOrders,
      totalCustomers,
      pendingOrders,
      monthlyRevenue: this.bucketByMonth(paidOrders),
      topProducts: topRaw.map((t) => ({
        name: t.name,
        quantity: t._sum.quantity ?? 0,
      })),
      recentOrders,
    };
  }

  // Roll paid orders up into the last 12 months (including empty months), so the
  // chart always has a consistent 12-column shape. Keys are "YYYY-MM".
  private bucketByMonth(orders: { createdAt: Date; total: number }[]) {
    const buckets = new Map<string, number>();
    for (const o of orders) {
      const key = this.monthKey(o.createdAt);
      buckets.set(key, (buckets.get(key) ?? 0) + o.total);
    }

    const now = new Date();
    const months: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = this.monthKey(d);
      months.push({ month: key, revenue: buckets.get(key) ?? 0 });
    }
    return months;
  }

  private monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
