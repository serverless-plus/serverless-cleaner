const { scf } = require('tencent-cloud-sdk');
const Apigw = require('./apigw');

class Scf {
  constructor({ credentials = {}, region, logger = console }) {
    this.region = region || 'ap-guangzhou';
    this.credentials = credentials;
    this.scfClient = new scf(this.credentials);
    this.apigwClient = new Apigw(this.credentials, this.region);
    this.logger = logger;
  }

  async request(inputs) {
    inputs.Region = this.region;
    inputs.Version = '2018-04-16';
    const { Response } = await this.scfClient.request(inputs);

    if (Response.Error) {
      this.logger.error(
        `Request API ${inputs.Action} failed: ${Response.Error.Message}`,
      );
      throw new Error(
        `Request API ${inputs.Action} failed: ${Response.Error.Message}`,
      );
    } else {
      return Response;
    }
  }

  async removeAll(exclude = [], namespace = 'default') {
    this.logger.info(`SCF - Start remove all functions`);
    const { Functions: functionList } = await this.request({
      Action: 'ListFunctions',
      Limit: 100,
    });

    for (let i = 0; i < functionList.length; i++) {
      const { FunctionName, Namespace } = functionList[i];
      if (exclude.indexOf(FunctionName) === -1 && Namespace === namespace) {
        try {
          await this.removeByName(FunctionName, Namespace);
        } catch (e) {}
      } else {
        this.logger.info(
          `SCF - Exclude functionName: ${FunctionName}, namespace: ${Namespace}`,
        );
      }
    }
    this.logger.info(`SCF - Success remove all functions`);
  }

  async removeByName(functionName, namespace = 'default') {
    this.logger.info(`SCF - Deleteing funtion ${functionName}`);
    const { Triggers: triggerList } = await this.request({
      Action: 'GetFunction',
      FunctionName: functionName,
    });

    await this.request({
      Action: 'DeleteFunction',
      FunctionName: functionName,
      Namespace: namespace,
    });

    if (triggerList) {
      for (let i = 0; i < triggerList.length; i++) {
        const trigger = triggerList[i];
        if (trigger.serviceId) {
          await this.apigwClient.removeById(trigger.serviceId);
        }
      }
    }
    this.logger.info(`SCF - Removed function ${functionName} successfully`);
  }
}

module.exports = Scf;
