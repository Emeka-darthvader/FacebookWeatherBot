// the npm packages
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

const token = process.env.FB_VERIFY_TOKEN
const access = process.env.FB_ACCESS_TOKEN
// var witToken = "Y6MCPTQDZ4LXBW5OSWMPBZKSLQ5UZ7WP";


// const {Wit, log} = require('node-wit');
// const client = new Wit({
//   accessToken: witToken
// });

let weatherApiKey = process.env.OW_API_KEY;


app.set('port', (process.env.PORT || 4444))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.send('Hullo')
})

app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === token) {
    res.send(req.query['hub.challenge'])
  }

  res.send('No entry')
})

app.post('/webhook', (req, res) => {

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      //console.log(webhook_event);
      console.log(webhook_event.message.nlp.entities);


      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }

    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

function firstEntity(nlp, name) {
  return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

// function secondEntity(nlp, name){
//   return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
// }

function handleMessage(sender_psid, received_message) {

  let response;

  // Check if the message contains text
  if (received_message.text) {

    const greeting = firstEntity(received_message.nlp, 'greetings');

    const location = firstEntity(received_message.nlp, 'location');
    const weatherCall = firstEntity(received_message.nlp, 'intent');


    if (greeting && greeting.confidence > 0.8) {
      response = {
        "text": "Hi There!"
      }
       // Sends the response message
    callSendAPI(sender_psid, response);  
    }
    else if (location && location.confidence > 0.8) {

      var weatherCity = location.value;
      console.log("===========================");
      console.log(location);
      console.log("===========================");

      let weatherUrl = `http://api.openweathermap.org/data/2.5/weather?q=${weatherCity}&appid=${weatherApiKey}&units=metric`;

      request(weatherUrl, function (err, rsp) {
        if (err) {
          response = err;
          console.log('Werror:', err);
        }
        else {
          console.log('body:', rsp.body);
          let weather = JSON.parse(rsp.body);
          response = {
            "text": `The weather in ${weather.name} is ${weather.weather[0].description}. \n The Temperature is ${weather.main.temp} Celsius`
          }
        }

        // Sends the response message
        callSendAPI(sender_psid, response);
      });





    }
    else {
      // Create the payload for a basic text message
      response = {
        "text": `You sent the message: "${received_message.text}". Now send me an image!`
      }

      // Sends the response message
      callSendAPI(sender_psid, response);

    }


  }

}

function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": access },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

app.listen(app.get('port'), function () {
  console.log('running on port', app.get('port'))
})