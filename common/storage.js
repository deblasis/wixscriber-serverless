const {
  TableClient,
  AzureNamedKeyCredential,
} = require("@azure/data-tables");
const { BlobServiceClient } = require('@azure/storage-blob');

const account = process.env.StorageAccountName;
const accountKey = process.env.StorageKey;

const blobContainerName = "wixscriber";
const jobsTableName = "Jobs";
const storageAddress = `https://${account}.table.core.windows.net`;

const credential = new AzureNamedKeyCredential(account, accountKey);

const jobsTableClient = new TableClient(storageAddress, jobsTableName, credential);

const blobServiceClient = new BlobServiceClient(storageAddress, credential);
const containerClient = blobServiceClient.getContainerClient(blobContainerName);

  module.exports = {
    uploadBlob: async function(bucket, filename, data) {
        const blobName = `${bucket}/${filename}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        return await blockBlobClient.upload(data, data.length);
    },
    updateJobProgress: async function (userId, fileHash, props) {
        const entity = {
            partitionKey: userId,
            rowKey: fileHash,
            ...props
            };
            return await jobsTableClient.upsertEntity(entity);
    },
    getJobProgress: async function (userId, fileHash) {
        return await jobsTableClient.getEntity(userId, fileHash);
    }
  }