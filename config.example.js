// TODO: change config.example.js to config.js
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
