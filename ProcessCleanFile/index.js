const fs = require("fs");
const tmp = require("tmp");
const transcriber = require("./transcriber");

const { updateJobProgress, setMemo } = require("../common/storage");

module.exports = async function (context, cleanAudioBlob) {
  context.log(
    "JavaScript blob trigger function processed blob \n Blob:",
    context.bindingData.blobTrigger,
    "\n Blob Size:",
    cleanAudioBlob.length,
    "Bytes"
  );

  const { userId, hash } = context.bindingData;
  if (!userId || !hash) {
    context.log("invalid inputs");
    return;
  }

  context.log("saving cleanBlob to tmp file for transcription");
  const tmpFile = tmp.fileSync();
  const file = fs.createWriteStream(tmpFile.name);
  file.write(cleanAudioBlob);

  const transcription = await transcriber(context, `${tmpFile.name}`, userId, hash);
  context.log("transcription", transcription);

  await updateJobProgress(userId, hash, {transcription});

  await setMemo(hash, "transcription", transcription);

  tmpFile.removeCallback();
};
