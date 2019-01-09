var Twit = require("twit");

exports.handler = function(event, context, callback) {
  const image = event.queryStringParameters["image"].split(",")[1];
  const T = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
  });

  const slack = {
    first: process.env.SLACK_FIRST,
    second: process.env.SLACK_SECOND,
    third: process.env.SLACK_THIRD
  };

  const sendToSlack = message => {
    fetch(
      `https://hooks.slack.com/services/${slack.first}/${slack.second}/${
        slack.third
      }`,
      {
        statusCode: 200,
        body: JSON.stringify({
          message: message
        })
      }
    );
  };

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
      sendToSlack(
        `Аватар обновлён https://twitter.com/baradusov: ${
          response.profile_image_url
        }.`
      );
    }
  );
};
