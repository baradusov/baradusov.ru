var Twit = require("twit");
var request = require("request");

exports.handler = function (event, context, callback) {
  const image = event.body.split(",")[1];
  const T = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  });

  const slackURL = process.env.SLACK_URL;

  T.post(
    "account/update_profile_image",
    {
      image: image,
    },
    (err, data, response) => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: data,
          error: err,
          response: response,
        }),
      });

      T.post("media/upload", { media_data: image }, function (
        err,
        data,
        response
      ) {
        const params = {
          status: "@baradusov кто-то нарисовал новый аватар",
          in_reply_to_status_id: "1082952476331044864",
          media_ids: [data.media_id_string],
        };

        T.post("statuses/update", params, function (err, data, response) {
          console.log(data);
        });
      });

      request.post(
        {
          url: slackURL,
          json: {
            text:
              "Аватар обновлён https://twitter.com/baradusov. Картиночка: " +
              data.profile_image_url_https.replace("_normal", ""),
          },
        },
        (err, httpResponse, body) => {
          return console.log("Slack message sent");
        }
      );
    }
  );
};
