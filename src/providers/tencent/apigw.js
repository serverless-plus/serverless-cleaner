const { apigw } = require('tencent-cloud-sdk');

class Apigw {
  constructor({ credentials = {}, region, logger = console }) {
    this.region = region || 'ap-guangzhou';
    this.credentials = credentials;
    this.apigwClient = new apigw(this.credentials);
    this.logger = logger;
  }

  async request(inputs) {
    inputs.Region = this.region;
    const result = await this.apigwClient.request(inputs);
    if (result.code != 0) {
      this.logger.error(
        `Request API ${inputs.Action} failed: ${result.message}`,
      );
      throw new Error(`Request API ${inputs.Action} failed: ${result.message}`);
    } else {
      return result;
    }
  }

  async removeAll(exclude = []) {
    this.logger.info(`APIGW - Start remove all APIGW services..`);
    const { serviceStatusSet: serviceList } = await this.request({
      Action: 'DescribeServicesStatus',
      limit: 100,
    });

    for (let i = 0; i < serviceList.length; i++) {
      const { serviceId, serviceName } = serviceList[i];
      if (exclude.indexOf(serviceId) === -1) {
        try {
          await this.removeById(serviceId);
        } catch (e) {}
      } else {
        this.logger.info(
          `APIGW - Exclude serviceId: ${serviceId}, serviceName: ${serviceName}`,
        );
      }
    }
    this.logger.info(`APIGW - Success remove all APIGW services`);
  }

  async removeById(serviceId) {
    const environment = 'release';
    const { apiIdStatusSet: apiList } = await this.request({
      Action: 'DescribeApisStatus',
      serviceId,
    });

    // remove all apis
    for (let i = 0; i < apiList.length; i++) {
      const curApi = apiList[i];
      // remove usage plan
      if (curApi.usagePlan) {
        // 1.1 unbind secrete ids
        const { secrets } = curApi.usagePlan;
        if (secrets && secrets.secretIds) {
          await this.request({
            Action: 'UnBindSecretIds',
            secretIds: secrets.secretIds,
            usagePlanId: curApi.usagePlan.id,
          });
          // delelet all created api key
          for (let sIdx = 0; sIdx < secrets.secretIds.length; sIdx++) {
            const secretId = secrets.secretIds[sIdx];
            await this.request({
              Action: 'DisableApiKey',
              secretId,
            });
            await this.request({
              Action: 'DeleteApiKey',
              secretId,
            });
          }
        }

        // unbind environment
        await this.request({
          Action: 'UnBindEnvironment',
          serviceId,
          usagePlanIds: [curApi.usagePlan.id],
          environment,
          bindType: curApi.bindType,
          apiIds: [curApi.apiId],
        });

        await this.request({
          Action: 'DeleteUsagePlan',
          usagePlanId: curApi.usagePlan.id,
        });
      }

      this.logger.info(`APIGW - Removing api: ${curApi.apiId}`);
      await this.request({
        Action: 'DeleteApi',
        apiId: curApi.apiId,
        serviceId,
      });
    }

    // unrelease service
    try {
      this.logger.info(
        `APIGW - Unreleasing service: ${serviceId}, environment: ${environment}`,
      );
      await this.request({
        Action: 'UnReleaseService',
        serviceId,
        environmentName: environment,
        unReleaseDesc: 'Offlined By Serverless Framework',
      });
    } catch (e) {}

    // delete service
    this.logger.info(`APIGW - Removing service: ${serviceId}`);
    await this.request({
      Action: 'DeleteService',
      serviceId,
    });
  }
}

module.exports = Apigw;
