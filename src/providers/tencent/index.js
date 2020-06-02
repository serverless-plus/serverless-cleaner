const { prompt } = require('inquirer');
const Apigw = require('./apigw');
const Scf = require('./scf');
const logger = require('../../logger');
let {
  region,
  credentials,
  apigwOptions = {},
  scfOptions = {},
} = require('../../../config').tencent;

async function clean() {
  if (!region) {
    const { inputRegion } = await prompt([
      {
        type: 'input',
        name: 'inputRegion',
        message: 'Please input region you want to delete?',
        default: 'ap-guangzhou',
        validate(input, answers) {
          if (!input) {
            return 'Please input region';
          }
          return true;
        },
      },
    ]);
    region = inputRegion;
  }

  const { apigwConfirm } = await prompt([
    {
      type: 'confirm',
      name: 'apigwConfirm',
      message: 'Are you sure to delete all exist APIGW?',
    },
  ]);
  if (apigwConfirm === true) {
    const api = new Apigw({ credentials, region, logger });
    await api.removeAll(apigwOptions);
  }

  const { scfConfirm } = await prompt([
    {
      type: 'confirm',
      name: 'scfConfirm',
      message: 'Are you sure to delete all exist SCF?',
    },
  ]);
  if (scfConfirm === true) {

    const { namespace } = await prompt([
      {
        type: 'input',
        name: 'namespace',
        message: 'Please input scf namespace you want to delete?',
        default: 'default',
      },
    ]);
    scfOptions.namespace = namespace
    const scf = new Scf({ credentials, region, logger });
    await scf.removeAll(scfOptions);
  }
}

module.exports = clean;
