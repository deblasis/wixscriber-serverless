const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require("fs");

const {
  updateJobProgress,
} = require("../common/storage");

const subscriptionKey = process.env.CognitiveServicesSubscriptionKey;
const serviceRegion = process.env.CognitiveServicesAppRegion || "eastus";
const language = process.env.CognitiveServicesLanguage || "en-US";

module.exports = async function (context, filename, userId, hash) {
  return new Promise((resolve, reject) => {
    // create the push stream we need for the speech sdk.
    var pushStream = sdk.AudioInputStream.createPushStream();

    // open the file and push it to the push stream.
    fs.createReadStream(filename)
      .on("data", function (arrayBuffer) {
        pushStream.write(arrayBuffer.slice());
      })
      .on("end", function () {
        pushStream.close();
      });

    // we are done with the setup
    context.log(`Transcribing from ${filename}`);

    let output = `WEBVTT\r\n\r\n`;
      // now create the audio-config pointing to our stream and
      // the speech config specifying the language.
      var speechConfig = sdk.SpeechConfig.fromSubscription(
        subscriptionKey,
        serviceRegion
      );
      var audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // setting the recognition language to English.
      speechConfig.speechRecognitionLanguage = language;

      // trying to bypass initial silence errors
      speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        "100000"
      );
      speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        "100000"
      );

      // create the speech recognizer.
      var reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // Before beginning speech recognition, setup the callbacks to be invoked when an event occurs.

      // The event recognizing signals that an intermediate recognition result is received.
      // You will receive one or more recognizing events as a speech phrase is recognized, with each containing
      // more recognized speech. The event will contain the text for the recognition since the last phrase was recognized.
      reco.recognizing = async function (s, e) {
        var str =
          "(recognizing) Reason: " +
          sdk.ResultReason[e.result.reason] +
          " Text: " +
          e.result.text;
        context.log(str);

        await updateJobProgress(userId, hash, {
          progress: `recognizing: "${e.result.text}..."`,
        });

      };

      // The event recognized signals that a final recognition result is received.
      // This is the final event that a phrase has been recognized.
      // For continuous recognition, you will get one recognized event for each phrase recognized.
      reco.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.NoMatch) {
          const noMatchDetail = sdk.NoMatchDetails.fromResult(e.result);
          context.log(
            "(recognized)  Reason: " +
              sdk.ResultReason[e.result.reason] +
              " | NoMatchReason: " +
              sdk.NoMatchReason[noMatchDetail.reason]
          );
        } else {
          context.log(
            `(recognized)  Reason: ${
              sdk.ResultReason[e.result.reason]
            } | Duration: ${e.result.duration} | Offset: ${e.result.offset}`
          );
          context.log(`Text: ${e.result.text}`);
          output += `${parseTime(e.result.offset)} --> ${parseTime(e.result.offset + e.result.duration)}\r\n`;
          output += `${e.result.text}\r\n\r\n`;
        }
      };

      // Signals that the speech service has started to detect speech.
      reco.speechStartDetected = function (s, e) {
        var str = "(speechStartDetected) SessionId: " + e.sessionId;
        context.log(str);
      };

      // Signals that the speech service has detected that speech has stopped.
      reco.speechEndDetected = (s, e) => {
        context.log(`(speechEndDetected) SessionId: ${e.sessionId}`);
        reco.close();
        reco = undefined;
        resolve(output);
      };

      // start the recognizer and wait for a result.
      reco.startContinuousRecognitionAsync(
        () => {
          context.log("Recognition started");
        },
        (err) => {
          console.trace("err - " + err);
          recognizer.close();
          recognizer = undefined;
          reject(err);
        }
      );
    });

};


function parseTime(nano) {
    let hour = Math.floor(nano / 36000000000);
    const temp = nano % 36000000000;
    let minute = Math.floor(temp / 600000000);
    const temp2 = temp % 600000000;
    let second = Math.floor(temp2 / 10000000);
    let mil = temp2 % 10000000;
    hour = hour.toString();
    minute = minute.toString();
    second = second.toString();
    mil = mil.toString().slice(0, 3)
    return `${pad(hour,2)}:${pad(minute,2)}:${pad(second,2)}.${pad(mil,3)}`
}

function pad(num, size) {
  num = num.toString();
  while (num.length < size) num = "0" + num;
  return num;
}