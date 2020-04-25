## Serverless Cleaner

Clean tools for serverless resources.

## Support providers

- Tencent

  - [x] [APIGW](https://console.cloud.tencent.com/apigateway)
  - [x] [SCF](https://console.cloud.tencent.com/scf)

- AWS
  - [ ] [APIGW](https://console.aws.amazon.com/apigateway)
  - [ ] [Lambda](https://console.aws.amazon.com/lambda)

## Usage

### Install dependencies

```bash
$ npm install
```

### Config

Copy `config.example.js` to `config.js`， and config it for yourself.

For example, below is a config for provider Tencent:

```js
module.exports = {
  tencent: {
    // resource region, if not config, you can input when running
    region: 'ap-guangzhou',
    // credentials
    credentials: {
      SecretId: '',
      SecretKey: '',
    },
    apigwOptions: {
      // serviceIds to exclude
      // before you run the clean script, please add your importance service ids here
      // so it will not be cleaned
      exclude: [],

      // serviceIds to include, priority higher than exclude
      // if include set, exclude will be ignored
      include: [],
    },
    scfOptions: {
      // function name to exclude
      // before you run the clean script, please add your importance function names here
      // so it will not be cleaned
      exclude: [],

      // function name to include, priority higher than exclude
      // if include set, exclude will be ignored
      include: [],
    },
  },
};
```

### Start

```bash
$ npm run clean
```

## License

Copyright (c) 2020 Serverless Plus
