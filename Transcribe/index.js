const fs = require("fs");
const tmp = require("tmp");
const axios = require("axios");
const stream = require("stream");
const { promisify } = require("util");
const crypto = require("crypto");

const { uploadBlob, updateJobProgress } = require("../common/storage");

const code = process.env.AuthCode;

module.exports = async function (context, req) {
  context.log("JavaScript HTTP trigger function processed a request.");

  const authCode = req.headers["authorization"];
  if (!authCode || authCode != code) {
    context.res = {
      status: 403,
      body: "Unauthorized",
    };
    context.done();
  }

  const { fileUrl, userId } = req.body;
  context.log(`req: fileUrl ${fileUrl} userId: ${userId}`);

  const finished = promisify(stream.finished);

  const tmpFile = tmp.fileSync();

  const file = fs.createWriteStream(tmpFile.name);

  context.log(`file downloading from ${fileUrl}`);
  await axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  }).then(function (response) {
    response.data.pipe(file);
    context.log(`file downloaded as ${tmpFile.name}`);
    return finished(file);
  });

  const hash = hashFile(tmpFile.name);
  context.log(`hash ${hash}`);

  const jobDetails = {
    fileName: fileUrl,
    rawFile: `raw/${userId}-_-${hash}`,
    cleanAudioFile: "",
    transcription: "",
  };
  try {
    await uploadBlob("raw", `${userId}-_-${hash}`, tmpFile.name);
    context.log(`file stored in blobstorage as raw/${userId}-_-${hash}`);
  } catch (err) {
    context.log(`error`, err);
  }


  await updateJobProgress(userId, hash, jobDetails);
//   jobDetails.userId = userId;
//   jobDetails.hash = hash;
  context.res = {
    body: JSON.stringify(({...jobDetails,userId,hash})),
  };

  try {
    tmpFile.removeCallback();
  } catch (err) {
    context.log(`error`, err);
  }
};

function hashFile(fileName) {
  const fileBuffer = fs.readFileSync(fileName);
  const hashSum = crypto.createHash("sha1");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}
