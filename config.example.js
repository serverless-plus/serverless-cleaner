// TODO: change config.example.js to config.js
module.exports = {
  tencent: {
    // resource region
    region: 'ap-guangzhou',
    // credentials
    credentials: {
      SecretId: '',
      SecretKey: '',
    },
    // serviceIds to exclude
    // before you run the clean script, please add your importance service ids here
    // so it will not be cleaned
    excludeServiceIds: [],
    // function name to exclude
    // before you run the clean script, please add your importance function names here
    // so it will not be cleaned
    excludeFunctionNames: [],
  },
};
