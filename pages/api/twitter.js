var Twit = require('twit');
const { Telegraf } = require('telegraf');

const {
  MY_TELEGRAM_ID,
  BOT_TOKEN,
  CONSUMER_KEY,
  CONSUMER_SECRET,
  ACCESS_TOKEN,
  ACCESS_TOKEN_SECRET,
} = process.env;

const bot = new Telegraf(BOT_TOKEN);
const twitter = new Twit({
  consumer_key: CONSUMER_KEY,
  consumer_secret: CONSUMER_SECRET,
  access_token: ACCESS_TOKEN,
  access_token_secret: ACCESS_TOKEN_SECRET,
});

const updateProfileCallback = async (data, tRes, res) => {
  const newUserPic = data.profile_image_url_https.replace('_normal', '');
  await bot.telegram.sendDocument(MY_TELEGRAM_ID, newUserPic, {
    caption: `Кто-то нарисовал аватарку [для твиттера](https://twitter.com/baradusov).`,
    parse_mode: 'Markdown',
  });

  res.status(tRes.statusCode).json({
    response: { statusCode: tRes.statusCode },
  });
};

export default (req, res) => {
  const image = req.body.split(',')[1];
  const options = {
    image: image,
  };

  twitter.post('account/update_profile_image', options, (err, data, tRes) => {
    if (err) {
      console.log('Аватар не обновлён:', err.message);
      return res.status(tRes.statusCode).json({
        response: { statusCode: tRes.statusCode },
      });
    }

    updateProfileCallback(data, tRes, res);
  });
};

// fix for false positive message 'API resolved without sending a response for /api/twitter, this may result in stalled requests.'
// https://nextjs.org/docs/api-routes/api-middlewares#custom-config
export const config = {
  api: {
    externalResolver: true,
  },
};
