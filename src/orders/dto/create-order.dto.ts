import { Type } from 'class-transformer';
import {
  ArrayNotEmpty, IsArray, IsEnum, IsInt, IsString, MinLength, Min, ValidateNested,
} from 'class-validator';
import { PaymentMethod } from 'generated/prisma/enums';

export class OrderItemInput {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class ShippingAddressInput {
  @IsString() @MinLength(1) fullName: string;
  @IsString() @MinLength(1) street: string;
  @IsString() @MinLength(1) city: string;
  @IsString() @MinLength(1) phone: string;
  @IsString() @MinLength(1) country: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];

  @ValidateNested()
  @Type(() => ShippingAddressInput)
  address: ShippingAddressInput;

  @IsEnum(PaymentMethod)          // must be 'CARD' or 'CASH'
  paymentMethod: PaymentMethod;
}