var Twit = require("twit");
var request = require("request");

exports.handler = function(event, context, callback) {
  const image = event.queryStringParameters["image"].split(",")[1];
  const T = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
  });

  const slackURL = process.env.SLACK_URL;

  T.post(
    "account/update_profile_image",
    {
      image: image
    },
    (err, data, response) => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: data,
          error: err,
          response: response
        })
      });

      request.post(
        {
          url: slackURL,
          json: {
            text: `Аватар обновлён https://twitter.com/baradusov. Картиночка: ${
              message.profile_image_url_https
            }`
          }
        },
        (err, httpResponse, body) => {
          return console.log("Slack message sent");
        }
      );
    }
  );
};
