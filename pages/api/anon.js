const { Telegraf } = require('telegraf');

const { MY_TELEGRAM_ID, BOT_TOKEN } = process.env;

const bot = new Telegraf(BOT_TOKEN);

export default async (req, res) => {
  const message = `*Анонимное сообщение*:\n${req.body}`;

  await bot.telegram.sendMessage(MY_TELEGRAM_ID, message, {
    parse_mode: 'Markdown',
  });

  return res.status(200).send({});
};
