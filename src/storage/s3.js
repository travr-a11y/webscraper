const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');
const logger = require('../logger');

let client = null;

function getS3Client() {
  if (!client && config.s3.endpoint && config.s3.accessKey && config.s3.secretKey) {
    client = new S3Client({
      endpoint: config.s3.endpoint,
      region: 'auto',
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
    });
  }
  return client;
}

async function uploadResult(domain, jobId, data) {
  const s3 = getS3Client();
  if (!s3 || !config.s3.bucket) {
    logger.debug('S3 not configured, skipping upload');
    return null;
  }

  const key = `${domain}-${Date.now()}-${jobId}.json`;
  const body = JSON.stringify(data, null, 2);

  await s3.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: body,
    ContentType: 'application/json',
  }));

  logger.info(`Uploaded to S3: ${key}`);
  return key;
}

module.exports = { uploadResult };
