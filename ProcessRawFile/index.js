const fs = require('fs');
const tmp = require('tmp');
const { exec } = require('child_process');


const {updateJobProgress, uploadBlob} = require("../common/storage");


const trimLenght = process.env.AudioTrimLenght || 30;


module.exports = async function (context, rawBlob, userId, hash) {
    context.log("JavaScript blob trigger function processed blob \n Blob:", context.bindingData.blobTrigger, "\n Blob Size:", rawBlob.length, "Bytes");



    const tmpFile = tmp.fileSync();
    const file = fs.createWriteStream(tmpFile.name);
    file.write(rawBlob);

    context.log(`trimming it to ${trimLenght}s, applying simple denoising and extracting audio only`);
    // 1 channel 16000kHz 16bit
    let ffmpeg = exec(`ffmpeg -i ${tmpFile.name} -t ${trimLenght} -ac 1 -ar 16000 -acodec pcm_s16le -af "highpass=f=200, lowpass=f=3000" ${tmpFile.name}.wav`, (error, stdout, stderr) => {
        if (error) {
            context.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            context.log(`stderr: ${stderr}`);
            return;
        }
        context.log(`stdout: ${stdout}`);
    });

    let ffmpegPromise = promisifyChildProcess(ffmpeg).then(function (result) {
        context.log('ffmpeg process complete: ' + result);
    }, function (err) {
        context.log('ffmpeg process failed: ' + err);
    });

    ffmpeg.stdout.on('data', function (data) {
        context.log('stdout: ' + data);
    });
    ffmpeg.stderr.on('data', function (data) {
        context.log('stderr: ' + data);
    });
    ffmpeg.on('close', function (code) {
        context.log('closing code: ' + code);
    });

    await ffmpegPromise;

    await updateJobProgress(userId, hash, {
        cleanAudioFile: `cleanAudio/${userId}-|-${hash}`
    });

    const cleanFile = await fs.readFileSync(`${tmpFile.name}.wav`);
    await uploadBlob("cleanAudio", `${userId}-|-${hash}`, cleanFile);

    context.log(`file stored in blobstorage as cleanAudio/${userId}-|-${hash}`);

    tmpFile.removeCallback();
};

function promisifyChildProcess(child) {
    return new Promise(function (resolve, reject) {
        child.addListener("error", reject);
        child.addListener("exit", resolve);
    });
}
