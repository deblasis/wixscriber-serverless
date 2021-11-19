const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

const connStr = process.env.StorageConnectionString;

const jobsTableClient = TableClient.fromConnectionString(connStr, "Jobs");
const memoTableClient = TableClient.fromConnectionString(connStr, "Memo");
const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);

const _getMemoIfExists = async function (hash, property) {
  let ret;
  try {
    ret = await memoTableClient.getEntity(hash, property);
  } finally {
    return ret;
  }
};



module.exports = {
  uploadBlob: async function (bucket, filename, file) {
    const containerClient = blobServiceClient.getContainerClient(bucket);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    return await blockBlobClient.uploadFile(file);
  },
  getMemoIfExists: _getMemoIfExists,
  setMemo: async function (hash, property, value) {
    const entity = {
      partitionKey: hash,
      rowKey: property,
      val: value,
    };
    return await memoTableClient.upsertEntity(entity);
  },
  updateJobProgress: async function (userId, hash, props) {
    const entity = {
      partitionKey: userId,
      rowKey: hash,
      ...props,
    };
    return await jobsTableClient.upsertEntity(entity);
  },
  getJobProgress: async function (userId, hash) {
    let ret;
    try {
      const memo = await _getMemoIfExists(hash, "transcription");
      if (memo && memo.val) {
        ret = {
          userid: userId,
          hash: hash,
          transcription: memo.val,
          isMemo: true,
        };
      } else {
        ret = await jobsTableClient.getEntity(userId, hash);
      }
    } finally {
      return ret;
    }
  },
};
