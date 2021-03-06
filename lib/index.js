'use strict';

const AWS = require('aws-sdk');

module.exports = {
  init(config) {
    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...config,
    });

    const upload = (file, customParams = {}) =>
      new Promise((resolve, reject) => {
        // upload file on S3 bucket
        const path = file.path ? `${file.path}/` : '';

        let params = {
          Key: `${path}${file.hash}${file.ext}`,
          Body: file.stream || Buffer.from(file.buffer, 'binary'),
          ContentType: file.mime,
          ...customParams,
        };

        if (!S3.config.cdnUrl) {
          params = {
            ...params,
            ACL: 'public-read',
          };
        }

        S3.upload(params, (err, data) => {
          if (err) {
            return reject(err);
          }

          if (S3.config.cdnUrl) {
            file.url = `${S3.config.cdnUrl}${data.Key}`;
          } else {
            file.url = data.Location;
          }

          resolve();
        });
      });

    return {
      uploadStream(file, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file, customParams = {}) {
        return upload(file, customParams);
      },
      delete(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          // delete file on S3 bucket
          const path = file.path ? `${file.path}/` : '';
          S3.deleteObject(
            {
              Key: `${path}${file.hash}${file.ext}`,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }

              resolve();
            }
          );
        });
      },
    };
  },
};
