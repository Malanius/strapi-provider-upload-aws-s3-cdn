# @malanius/strapi-provider-upload-aws-s3-cloudfront

## Description

This version of provider is identical with the offical one [here](https://github.com/strapi/strapi/blob/master/packages/strapi-provider-upload-aws-s3/), the only difference being that the ACL: 'public-read' config is removed when CDN url parameter is present. It's essentially combination of following providers that each deals only with one part of the problem:

- [cristian-rita/strapi-provider-upload-aws-s3-private](https://github.com/cristian-rita/strapi-provider-upload-aws-s3-private)
- [shadab-hashmi/strapi-provider-upload-aws-s3-cdn-acl-enabled](https://github.com/shadab-hashmi/strapi-provider-upload-aws-s3-cdn-acl-enabled)

## Installation

```bash
# using yarn
yarn add @malanius/strapi-provider-upload-aws-s3-cdn

# using npm
npm install @malanius/strapi-provider-upload-aws-s3-cdn
```

## Configurations

Your configuration is passed down to the provider. (e.g: `new AWS.S3(config)`). You can see the complete list of options [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property)

See the [using a provider](https://docs.strapi.io/developer-docs/latest/plugins/upload.html#using-a-provider) documentation for information on installing and using a provider. And see the [environment variables](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#environment-variables) for setting and using environment variables in your configs.

### Configuration environment variables

Required environment variables:

- `AWS_BUCKET` - name of the bucket the uploaded media is stored into (used for upload/delete requests)

Optional environment variables:

- `CDN_URL` - if present, sotres this as part of the media URL, ommits public ACL on bucket object
- `AWS_REGION` - required for middleware configuration if using public bucket withou CDN

Optinal AWS credentials & info - specifdy these if not running on AWS infrastructure (like EC2/ECS) that can provide IAM role:

- `AWS_ACCESS_KEY_ID`
- `AWS_ACCESS_SECRET`

### Provider Configuration

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: '@malanius/strapi-provider-upload-aws-s3-cdn', // full name is required
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
        region: env('AWS_REGION'),
        params: {
          Bucket: env('AWS_BUCKET'),
        },
        cdnUrl: `https://${env('CDN_URL')}/`, // Optional, will point the stored URL to cDN distribution if present, otherwise to bucket (has to be public in that case)
    },
      },
    },
  },
  // ...
});
```

This is also working with IAM roles. You just need to omit the accessKeyId and secretAccessKey and AWS SDK will automatically select the IAM credentials.

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    provider: 'aws-s3-private',
    providerOptions: {
      params: {
        Bucket: env('AWS_BUCKET'),
      },
      cdnUrl: `https://${env('CDN_URL')}/`, // Optional, will point the stored URL to cDN distribution if present, otherwise to bucket (has to be public in that case)
    },
    },
  },
  // ...
});
```

### Security Middleware Configuration

Due to the default settings in the Strapi Security Middleware you will need to modify the `contentSecurityPolicy` settings to properly see thumbnail previews in the Media Library. You should replace `strapi::security` string with the object bellow instead as explained in the [middleware configuration](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/middlewares.html#loading-order) documentation.

`./config/middlewares.js`

```js
module.exports = [
  // ...
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', env('CDN_URL')], // for CDN
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            `${env('AWS_BUCKET')}.s3.${env('AWS_REGION')}.amazonaws.com`,
          ], //for public bucket
          'media-src': ["'self'", 'data:', 'blob:', env('CDN_URL')],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            `${env('AWS_BUCKET')}.s3.${env('AWS_REGION')}.amazonaws.com`,
          ], //for public bucket
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // ...
];
```

## Required AWS Policy Actions

These are the minimum amount of permissions needed for this provider to work.

```json
"Action": [
  "s3:PutObject",
  "s3:GetObject",
  "s3:ListBucket",
  "s3:DeleteObject",
  "s3:PutObjectAcl"
],
```
