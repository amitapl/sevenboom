const VERSION = '1.0';

var express = require('express');
var bodyParser = require('body-parser');
var verifier = require('alexa-verifier-middleware');

function run(port) {
  var app = express();

  app.get('/', function(req, res) {
    res.json({ message: 'Seven Boom is up and running.', since: (new Date()).toString() });
  });

  // create a router and attach to express before doing anything else
  var alexaRouter = express.Router();
  app.use('/alexa', alexaRouter);

  // attach the verifier middleware first because it needs the entire
  // request body, and express doesn't expose this on the request object
  alexaRouter.use(verifier);
  alexaRouter.use(bodyParser.json());

  // Routes that handle alexa traffic are now attached here.
  // Since this is attached to a router mounted at /alexa,
  // this endpoint will be accessible at /alexa/weather_info
  alexaRouter.post('/game', function (req, res) {
    if (req.body.request.type === 'LaunchRequest') {
      log('LaunchRequest');

      respond(res,
        { expectedNumber: 2},
        '1',
        false);
    } else if (req.body.request.type === 'SessionEndedRequest') {
      log('SessionEndedRequest');

      if (req.body.request.reason === 'ERROR') {
        console.error('Alexa ended the session due to an error');
      }

      /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
       Per Alexa docs, we shouldn't send ANY response here... weird, I know.
       * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

    } else if (
      req.body.request.type === 'IntentRequest' &&
      req.body.request.intent.name === 'Number' &&
      req.body.request.intent.slots.myNumber &&
      req.body.request.intent.slots.myNumber.value !== undefined) {

      let num = req.body.request.intent.slots.myNumber.value;
      handleNumber(req, res, num);
    } else if (
      req.body.request.type === 'IntentRequest' &&
      req.body.request.intent.name === 'Boom') {

      let num = 'boom';
      handleNumber(req, res, num);
    } else if (
      req.body.request.type === 'IntentRequest' &&
      req.body.request.intent.name === 'NewGame') {
        respond(res,
          { expectedNumber: 2},
          '1',
          false);
    } else {
      console.error('Intent not implemented: ', req.body);
      res.status(504).json({ message: 'Intent Not Implemented' });
    }
  });
  app.listen(port);

  log('Started ' + port);
}

function handleNumber(req, res, num) {
  let expectedNumber = (req.body.session.attributes && req.body.session.attributes.expectedNumber) || 0;
  let nextNumResult = calculateNextNumber(num, expectedNumber);

  log('Number ' + num + ', expectedNumber ' + expectedNumber + ', nextNumResult ' + nextNumResult.error + ' ' + nextNumResult.nextNumber + ' ' + nextNumResult.isBoom);

  respond(res,
    { expectedNumber: nextNumResult.nextNumber + 1},
    nextNumResult.error || (nextNumResult.isBoom ? '<emphasis level="moderate">BOOM</emphasis>' : '' + nextNumResult.nextNumber),
    false);
}

function calculateNextNumber(inputNumber, expectedNumber) {
  let num = inputNumber;
  try {
    if (num !== 'boom') {
      num = parseInt(inputNumber);
    }
  }
  catch(e) {
    num = undefined;
  }

  if (num === expectedNumber || (isNumberBoom(expectedNumber) && num === 'boom')) {
    let nextNumber = expectedNumber + 1;
    let isBoom = isNumberBoom(nextNumber);

    return {
      nextNumber,
      isBoom
    };
  }

  return {
    error: 'Oops, <break time=\"0.5s\"/> it should be ' + expectedNumber + ' and not ' + num + ', <break time=\"1s\"/> lets try again <break time=\"0.5s\"/> 1',
    nextNumber: 1
  }
}

function isNumberBoom(num) {
  if (num !== 0 && !num) {
    return false;
  }

  if (num % 7 === 0) {
    return true;
  }

  return ('' + num).indexOf('7') >= 0;
}

function respond(res, session, speech, end) {
  res.json({
    version: VERSION,
    sessionAttributes: session,
    response: {
      outputSpeech: {
        type: 'SSML',
        ssml: '<speak>' + speech + '</speak>'
      },
      shouldEndSession: !!end
    }
  });
}

function log(msg) {
  console.log((new Date()).toISOString() + ' ' + msg);
}

run(process.env.PORT || 3000);
