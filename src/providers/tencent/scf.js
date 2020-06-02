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

  async removeAll({ exclude = [], include = [], namespace = 'default' }) {
    if (exclude.length === 0 && include.length === []) {
      this.logger.info(`APIGW - Nothing to remove`);
      return;
    }

    this.logger.info(`SCF - Start remove functions`);
    if (include.length > 0) {
      for (let i = 0; i < include.length; i++) {
        await this.removeByName(include[i], namespace);
      }
    } else {
      const { Functions: functionList } = await this.request({
        Action: 'ListFunctions',
        Limit: 100,
        Namespace: namespace
      });

      for (let i = 0; i < functionList.length; i++) {
        const { FunctionName, Namespace } = functionList[i];
        if (exclude.indexOf(FunctionName) === -1 && Namespace === namespace) {
          await this.removeByName(FunctionName, Namespace);
        } else {
          this.logger.info(
            `SCF - Exclude functionName: ${FunctionName}, namespace: ${Namespace}`,
          );
        }
      }
    }
    this.logger.info(`SCF - Success remove functions`);
  }

  async removeByName(functionName, namespace = 'default') {
    if (!functionName) {
      return;
    }
    try {
      this.logger.info(`SCF - Deleteing funtion ${functionName}`);
      const { Triggers: triggerList } = await this.request({
        Action: 'GetFunction',
        FunctionName: functionName,
        Namespace: namespace,
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
    } catch (e) {
      this.logger.error(e);
    }
  }
}

module.exports = Scf;
