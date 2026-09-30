import { Telegraf, Markup } from 'telegraf';
import express from 'express';

// Environment Variables (Tokens & Links only)
const BOT1_PAYMENT_TOKEN = process.env.BOT1_PAYMENT_TOKEN;
const BOT2_DELIVERY_TOKEN = process.env.BOT2_DELIVERY_TOKEN;
const DELIVERY_LINK_1 = process.env.DELIVERY_LINK_1;

const BOT3_PAYMENT_TOKEN = process.env.BOT3_PAYMENT_TOKEN;
const BOT4_DELIVERY_TOKEN = process.env.BOT4_DELIVERY_TOKEN;
const DELIVERY_LINK_2 = process.env.DELIVERY_LINK_2;

// Validation
if (
  !BOT1_PAYMENT_TOKEN || !BOT2_DELIVERY_TOKEN || !DELIVERY_LINK_1 ||
  !BOT3_PAYMENT_TOKEN || !BOT4_DELIVERY_TOKEN || !DELIVERY_LINK_2
) {
  console.error("Missing required environment variables!");
  process.exit(1);
}

// In-memory payment trackers
const pair1PaidUsers = new Set();
const pair2PaidUsers = new Set();

// Initialize 4 Bots via Telegraf
const paymentBot1 = new Telegraf(BOT1_PAYMENT_TOKEN);
const deliveryBot1 = new Telegraf(BOT2_DELIVERY_TOKEN);

const paymentBot2 = new Telegraf(BOT3_PAYMENT_TOKEN);
const deliveryBot2 = new Telegraf(BOT4_DELIVERY_TOKEN);

// Store delivery bot usernames automatically fetched from Telegram API
let bot2Username = '';
let bot4Username = '';

// ==========================================
// PAIR 1: BOT 1 (Payment) & BOT 2 (Delivery)
// ==========================================

paymentBot1.on('pre_checkout_query', async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    console.error('Bot 1 Pre-checkout error:', error);
  }
});

paymentBot1.on('successful_payment', async (ctx) => {
  const userId = ctx.from.id;
  pair1PaidUsers.add(userId);

  console.log(`[Bot 1] Payment confirmed for user ${userId}`);

  const deliveryBotUrl = `https://t.me/${bot2Username}`;

  await ctx.reply(
    'Your payment was confirmed ✅\n\nStart this bot to get your primary channel access link 🔗',
    Markup.inlineKeyboard([
      [Markup.button.url('Open Delivery Bot 1', deliveryBotUrl)]
    ])
  );
});

deliveryBot1.start(async (ctx) => {
  const userId = ctx.from.id;

  if (pair1PaidUsers.has(userId)) {
    await ctx.reply(
      `🎉 Welcome! Here is your access link:\n\n${DELIVERY_LINK_1}`
    );
  } else {
    await ctx.reply(
      '❌ No active payment found. Please complete payment using Payment Bot 1 first.'
    );
  }
});

// ==========================================
// PAIR 2: BOT 3 (Payment) & BOT 4 (Delivery)
// ==========================================

paymentBot2.on('pre_checkout_query', async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    console.error('Bot 3 Pre-checkout error:', error);
  }
});

paymentBot2.on('successful_payment', async (ctx) => {
  const userId = ctx.from.id;
  pair2PaidUsers.add(userId);

  console.log(`[Bot 3] Payment confirmed for user ${userId}`);

  const deliveryBotUrl = `https://t.me/${bot4Username}`;

  await ctx.reply(
    'Your payment was confirmed ✅\n\nStart this bot to get your secondary channel access link 🔗',
    Markup.inlineKeyboard([
      [Markup.button.url('Open Delivery Bot 2', deliveryBotUrl)]
    ])
  );
});

deliveryBot2.start(async (ctx) => {
  const userId = ctx.from.id;

  if (pair2PaidUsers.has(userId)) {
    await ctx.reply(
      `🎉 Welcome! Here is your access link:\n\n${DELIVERY_LINK_2}`
    );
  } else {
    await ctx.reply(
      '❌ No active payment found. Please complete payment using Payment Bot 2 first.'
    );
  }
});

// ==========================================
// EXPRESS SERVER & BOT INITIALIZATION
// ==========================================

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('4-Bot Gateway Active.'));

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  try {
    // Fetch usernames automatically from Telegram via Bot Tokens
    const bot2Info = await deliveryBot1.telegram.getMe();
    const bot4Info = await deliveryBot2.telegram.getMe();

    bot2Username = bot2Info.username;
    bot4Username = bot4Info.username;

    // Launch all 4 bots
    paymentBot1.launch();
    deliveryBot1.launch();
    paymentBot2.launch();
    deliveryBot2.launch();

    console.log(`[Bot 2 Username]: @${bot2Username}`);
    console.log(`[Bot 4 Username]: @${bot4Username}`);
    console.log('All 4 Bots (2 Payment + 2 Delivery) are running successfully.');
  } catch (err) {
    console.error('Error starting bots or fetching bot usernames:', err);
  }
});

// Graceful Shutdown
const stopBots = (signal) => {
  paymentBot1.stop(signal);
  deliveryBot1.stop(signal);
  paymentBot2.stop(signal);
  deliveryBot2.stop(signal);
};

process.once('SIGINT', () => stopBots('SIGINT'));
process.once('SIGTERM', () => stopBots('SIGTERM'));
