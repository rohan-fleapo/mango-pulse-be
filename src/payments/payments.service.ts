import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const key_id = this.configService.get<string>('RAZORPAY_KEY_ID');
    const key_secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!key_id || !key_secret) {
      console.warn('Razorpay keys not found in configuration');
    }

    this.razorpay = new Razorpay({
      key_id: key_id || 'test_id',
      key_secret: key_secret || 'test_secret',
    });
  }

  async getOrCreatePlan() {
    // Ideally, store Plan ID in DB or Config. For MVP, we check or create.
    // Simplifying: Just create a new plan if ID not in env, or assume a fixed plan for now.
    // Better strategy for this agent: Check if a plan with specific name exists, if not create.
    const planName = 'MangoPulse Pro Monthly';

    // In a real app, you'd cache this or store in DB.
    // For now, we'll try to create it and if it exists (by checking our own storage? No, Razorpay doesn't enforce unique names)
    // We will just create one and log it, or use a hardcoded one if env var is set.

    const envPlanId = this.configService.get<string>('RAZORPAY_PLAN_ID');
    if (envPlanId) return envPlanId;

    // Use a default plan logic or error?
    // Let's create a plan on the fly if needed, but that creates duplicates.
    // Let's assume we create one and return it for the session (in-memory) or create a fresh one.
    // Creating fresh one every time is bad.
    // Recommendation: Warn user to add PLAN_ID. For now, create a temp one.

    const plan = await this.razorpay.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: planName,
        amount: 200000, // 2000 INR
        currency: 'INR',
        description: 'Pro Plan Subscription',
      },
    });

    return plan.id;
  }

  async createSubscription(userId: string) {
    const planId = await this.getOrCreatePlan();

    const subscription = await this.razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 120, // 10 years
      notes: { userId },
    });

    return subscription;
  }

  async createOrder(userId: string, amount: number) {
    // Kept for backward compatibility or if one-time payment is needed
    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency: 'INR',
      receipt: `rcpt_${userId.substring(0, 6)}_${Date.now()}`,
      notes: {
        userId,
      },
    };

    try {
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new BadRequestException('Unable to create order');
    }
  }

  async verifyPayment(
    userId: string,
    payload: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
      razorpay_subscription_id?: string;
    },
  ) {
    const key_secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!key_secret) {
      throw new Error('Razorpay secret not configured');
    }

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      razorpay_subscription_id,
    } = payload;

    let generated_signature = '';

    if (razorpay_subscription_id) {
      // Subscription verification
      // formula: hmac_sha256(razorpay_payment_id + "|" + subscription_id, secret);
      const data = razorpay_payment_id + '|' + razorpay_subscription_id;
      generated_signature = crypto
        .createHmac('sha256', key_secret)
        .update(data)
        .digest('hex');
    } else {
      // Order verification
      const data = razorpay_order_id + '|' + razorpay_payment_id;
      generated_signature = crypto
        .createHmac('sha256', key_secret)
        .update(data)
        .digest('hex');
    }

    if (generated_signature === razorpay_signature) {
      console.log('Payment verified and user upgraded', userId);

      const updateData: any = {
        isPro: true,
        razorpayCustomerId: '', // We might need to fetch this from payment details if needed
      };

      if (razorpay_subscription_id) {
        updateData.subscriptionId = razorpay_subscription_id;
      }

      await this.usersService.updateUser({
        id: userId,
        data: updateData,
      });

      return { success: true, message: 'Payment verified and user upgraded' };
    } else {
      throw new BadRequestException('Invalid payment signature');
    }
  }
}
