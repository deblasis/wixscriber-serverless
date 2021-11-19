const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

const connStr = process.env.StorageConnectionString;

const jobsTableClient = TableClient.fromConnectionString(connStr, "Jobs");
const memoTableClient = TableClient.fromConnectionString(connStr, "Memo");
const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);

module.exports = {
  uploadBlob: async function (bucket, filename, file) {
    const containerClient = blobServiceClient.getContainerClient(bucket);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    return await blockBlobClient.uploadFile(file);
  },
  getMemoIfExists: async function (hash, property) {
    let ret;
    try {
      ret = await memoTableClient.getEntity(hash, property);
    } finally {
      return ret;
    }
  },
  setMemo: async function (hash, property, value) {
    const entity = {
      partitionKey: hash,
      rowKey: property,
      val: value,
    };
    return await memoTableClient.upsertEntity(entity);
  },
  updateJobProgress: async function (userId, fileHash, props) {
    const entity = {
      partitionKey: userId,
      rowKey: fileHash,
      ...props,
    };
    return await jobsTableClient.upsertEntity(entity);
  },
  getJobProgress: async function (userId, fileHash) {
    let ret;
    try {
      ret = await jobsTableClient.getEntity(userId, fileHash);
    } finally {
      return ret;
    }
  },
};
