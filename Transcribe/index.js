
const fs = require('fs');
const tmp = require('tmp');
const axios = require('axios');
const stream = require('stream');
const { promisify } = require('util');
const { exec } = require('child_process');


const trimLenght = process.env.AudioTrimLenght || 30;
const code = process.env.AuthCode;


const transcriber = require('./transcriber');

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


    const { fileUrl } = req.body;
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
        return finished(file);
    });

    context.log(`file downloaded as ${tmpFile.name}`);

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

    const transcribed = await transcriber(context, `${tmpFile.name}.wav`);

    console.log("transcribed", transcribed);

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: transcribed
    };

}


function promisifyChildProcess(child) {
    return new Promise(function (resolve, reject) {
        child.addListener("error", reject);
        child.addListener("exit", resolve);
    });
}