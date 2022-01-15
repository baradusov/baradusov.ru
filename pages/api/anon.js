const { Telegraf } = require('telegraf');

const { MY_TELEGRAM_ID, BOT_TOKEN } = process.env;

const bot = new Telegraf(BOT_TOKEN);

export default async (req, res) => {
  const { message, url, contact } = JSON.parse(req.body);
  const title = url
    ? `*Анонимный комментарий*\nпод постом (${url})`
    : '*Анонимное сообщение*';
  const footer = contact ? `*контакт*:\n${contact}` : '';

  const preparedMessage = `
${title}:
_${message}_

${footer}
`;

  await bot.telegram.sendMessage(MY_TELEGRAM_ID, preparedMessage, {
    parse_mode: 'Markdown',
  });

  return res.status(200).send({});
};
