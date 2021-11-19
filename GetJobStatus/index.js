const { getJobProgress } = require("../common/storage");
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

  const { userId, hash } = req.query;
  context.log(`req: userId: ${userId} hash ${hash}`);

  const progress = await getJobProgress(userId, hash);
  context.res = {
    // status: 200, /* Defaults to 200 */
    body: JSON.stringify(progress),
  };
};
