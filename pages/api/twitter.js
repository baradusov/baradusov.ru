var Twit = require('twit');
var request = require('request');

export default (req, res) => {
  const image = req.body.split(',')[1];
  const T = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  });

  const slackURL = process.env.SLACK_URL;

  T.post(
    'account/update_profile_image',
    {
      image: image,
    },
    (err, data, response) => {
      res.status(response.statusCode).json({
        response: { statusCode: response.statusCode },
      });

      request.post(
        {
          url: slackURL,
          json: {
            text:
              'Аватар обновлён https://twitter.com/baradusov. Картиночка: ' +
              data.profile_image_url_https.replace('_normal', ''),
          },
        },
        (err, httpResponse, body) => {
          return console.log('Slack message sent');
        }
      );
    }
  );
};
