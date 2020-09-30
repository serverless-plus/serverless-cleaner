const { Capi } = require('@tencent-sdk/capi');
const { request } = require('./request');
const Apigw = require('./apigw');

class Cleaner {
  constructor({ credentials = {}, region, logger = console }) {
    this.region = region || 'ap-guangzhou';
    this.credentials = credentials;
    this.logger = logger;
    this.capi = new Capi({
      ...this.credentials,
      ServiceType: 'scf',
      Version: '2018-04-16',
      Region: this.region,
      isV3: true,
      debug: false,
    });
    this.apigw = new Apigw(this.credentials, this.region);
  }

  async request(inputs) {
    try {
      const Response = await request(this.capi, inputs);
      return Response;
    } catch (e) {
      this.logger.error(`Request API ${inputs.Action} failed: ${e.message}`);
      throw new Error(`Request API ${inputs.Action} failed: ${e.message}`);
    }
  }

  async removeAll({ exclude = [], include = [], namespace = 'default' }) {
    if (exclude.length === 0 && include.length === 0) {
      this.logger.info(`APIGW - Nothing to remove`);
      return;
    }

    this.logger.info(`SCF - Start remove functions`);
    if (include.length > 0) {
      for (let i = 0; i < include.length; i++) {
        await this.removeByName(include[i], namespace);
      }
    } else {
      const { Functions } = await this.request({
        Action: 'ListFunctions',
        Limit: 100,
        Namespace: namespace,
      });

      for (let i = 0; i < Functions.length; i++) {
        const { FunctionName, Namespace } = Functions[i];
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
      const { Triggers } = await this.request({
        Action: 'GetFunction',
        FunctionName: functionName,
        Namespace: namespace,
      });

      await this.request({
        Action: 'DeleteFunction',
        FunctionName: functionName,
        Namespace: namespace,
      });

      if (Triggers && Triggers.length > 0) {
        for (let i = 0; i < Triggers.length; i++) {
          const trigger = Triggers[i];
          if (trigger.ServiceId) {
            await this.apigw.removeById(trigger.serviceId);
          }
        }
      }
      this.logger.info(`SCF - Removed function ${functionName} successfully`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}

module.exports = Cleaner;
