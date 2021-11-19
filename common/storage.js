const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

const account = process.env.StorageAccountName;
const accountKey = process.env.StorageKey;

const jobsTableName = "Jobs";
const storageAddress = (type) => `https://${account}.${type}.core.windows.net`;

const ankCred = new AzureNamedKeyCredential(account, accountKey);
const sskCred = new StorageSharedKeyCredential(account, accountKey);

const blobServiceClient = BlobServiceClient.fromConnectionString("DefaultEndpointsProtocol=https;AccountName=storageaccountwixha9bf9;AccountKey=hKyRml0VvjDKQKUDYWsf53ZYsl+OgHdWVIXLooDfr08mDJuvaERrl/I7ruFot8m3cEbZegkCjCIkBMAxaaGT6Q==;EndpointSuffix=core.windows.net");
const jobsTableClient = new TableClient(
  storageAddress("table"),
  jobsTableName,
  sskCred
);

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
