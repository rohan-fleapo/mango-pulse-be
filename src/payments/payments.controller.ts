import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('order')
  @ApiOperation({ summary: 'Create a Razorpay order' })
  async createOrder(@Request() req) {
    // Assuming standard price for now, or pass from body if dynamic
    // Pro Plan: 2000 INR (monthly) or 20000 INR (yearly)
    // For MVP, letting frontend decide amount or hardcoding to 2000 for test
    // Better: Receive planId or amount from body
    // For now, let's accept amount from body to support both plans
    const amount = 2000; // Default testing
    return this.paymentsService.createOrder(req.user.id, amount);
  }

  @Post('create-subscription-order')
  @ApiOperation({ summary: 'Create a Razorpay order with custom amount' })
  async createCustomOrder(@Request() req, @Body() body: { amount: number }) {
    return this.paymentsService.createOrder(req.user.id, body.amount);
  }

  @Post('subscription')
  @ApiOperation({ summary: 'Create a Razorpay subscription' })
  async createSubscription(@Request() req) {
    return this.paymentsService.createSubscription(req.user.id);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  async verifyPayment(
    @Request() req,
    @Body()
    payload: {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      razorpay_subscription_id?: string;
    },
  ) {
    return this.paymentsService.verifyPayment(req.user.id, payload);
  }
}
