const fs = require('fs');
const tmp = require('tmp');
const transcriber = require('./transcriber');


const {updateJobProgress} = require("../common/storage");


module.exports = async function (context, cleanAudioBlob, userId, hash) {
    context.log("JavaScript blob trigger function processed blob \n Blob:", context.bindingData.blobTrigger, "\n Blob Size:", cleanAudioBlob.length, "Bytes");

    context.log("saving cleanBlob to tmp file for transcription");
    const tmpFile = tmp.fileSync();
    const file = fs.createWriteStream(tmpFile.name);
    file.write(cleanAudioBlob);

    const transcription = await transcriber(context, `${tmpFile.name}`);
    context.log("transcription", transcription);

    await updateJobProgress(userId, hash, {
        transcription: transcription
    });



    tmpFile.removeCallback();


};
