const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

const connStr = process.env.StorageConnectionString;

const jobsTableClient = TableClient.fromConnectionString(
  connStr,
  "Jobs"
);
const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);

module.exports = {
  uploadBlob: async function (bucket, filename, file) {
    const containerClient = blobServiceClient.getContainerClient(bucket);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    return await blockBlobClient.uploadFile(file);
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
    return await jobsTableClient.getEntity(userId, fileHash);
  },
};
