
const fs = require('fs');
const tmp = require('tmp');
const axios = require('axios');
const stream = require('stream');
const { promisify } = require('util');
const crypto = require("crypto");


const {uploadBlob} = require('../common/storage');


const code = process.env.AuthCode;



module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const authCode = req.headers["authorization"];
    if (!authCode || authCode != code) {
        context.res = {
            status: 403,
            body: "Unauthorized"
        }
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
        responseType: "stream"
    }).then(function (response) {
        response.data.pipe(file);
        context.log(`file downloaded as ${tmpFile.name}`);
        return finished(file);
    });

    const hash = hashFile(tmpFile.name);
    context.log(`hash ${hash}`);

    const job = {
        partitionKey: userId,
        rowKey: hash,
        fileName: fileUrl,
        rawFile: `raw/${userId}-_-${hash}`,
        cleanAudioFile: "",
        transcription: ""
    }

    await uploadBlob("raw", `${userId}-_-${hash}`, file);
    context.log(`file stored in blobstorage as raw/${userId}-_-${hash}`);

    context.res = {
        body: JSON.stringify(job)
    }

    context.bindings.jobsTable = [];
    context.bindings.jobsTable.push(job);


    tmpFile.removeCallback();
}



function hashFile(fileName) {
    const fileBuffer = fs.readFileSync(fileName);
    const hashSum = crypto.createHash('sha1');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }