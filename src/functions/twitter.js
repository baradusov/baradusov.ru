var Twit = require('twit');

exports.handler = function(event, context, callback) {
  const image = event.queryStringParameters['image'].split(',')[1];
  const T = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
  });

  T.post('account/update_profile_image', {
    image: image
  }, (err, data, response) => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(
          {
            "message": data,
            "error": err,
            "response": response
          }
        )
      });
  });
}