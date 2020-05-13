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

  async removeAll({ exclude = [], include = [] }) {
    if (exclude.length === 0 && include.length === []) {
      this.logger.info(`APIGW - Nothing to remove`);
      return;
    }

    this.logger.info(`APIGW - Start remove APIGW services`);
    if (include.length > 0) {
      for (let i = 0; i < include.length; i++) {
        await this.removeById(include[i]);
      }
    } else {
      const { serviceStatusSet: serviceList } = await this.request({
        Action: 'DescribeServicesStatus',
        limit: 100,
      });

      for (let i = 0; i < serviceList.length; i++) {
        const { serviceId } = serviceList[i];
        if (exclude.indexOf(serviceId) === -1) {
          await this.removeById(serviceId);
        } else {
          this.logger.info(`APIGW - Exclude serviceId: ${serviceId}`);
        }
      }
    }
    this.logger.info(`APIGW - Success remove APIGW services`);
  }

  async removeApiUsagePlan(serviceId, apiId) {
    const { usagePlanList = [] } = await this.request({
      Action: 'DescribeApiUsagePlan',
      serviceId,
      apiIds: [apiId],
    });

    for (let i = 0; i < usagePlanList.length; i++) {
      const currentUsagePlan = usagePlanList[i];
      this.logger.info(
        `APIGW - Removing api usage plan: ${currentUsagePlan.usagePlanId}`,
      );
      const { secretIdList = [] } = await this.request({
        Action: 'DescribeUsagePlanSecretIds',
        usagePlanId: currentUsagePlan.usagePlanId,
        offset: 0,
        limit: 100,
      });

      const secretIds = secretIdList.map((item) => item.secretId);

      if (secretIds && secretIds.length > 0) {
        await this.request({
          Action: 'UnBindSecretIds',
          secretIds: secretIds,
          usagePlanId: currentUsagePlan.usagePlanId,
        });
        // delelet all created api key
        for (let sIdx = 0; sIdx < secretIds.length; sIdx++) {
          const secretId = secretIds[sIdx];
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
        usagePlanIds: [currentUsagePlan.usagePlanId],
        environment: currentUsagePlan.environment,
        bindType: 'API',
        apiIds: [apiId],
      });

      await this.request({
        Action: 'DeleteUsagePlan',
        usagePlanId: currentUsagePlan.usagePlanId,
      });
    }
  }

  async removeById(serviceId) {
    if (!serviceId) {
      return;
    }
    try {
      const { apiIdStatusSet: apiList } = await this.request({
        Action: 'DescribeApisStatus',
        serviceId,
      });

      // remove all apis
      for (let i = 0; i < apiList.length; i++) {
        const curApi = apiList[i];

        await this.removeApiUsagePlan(serviceId, curApi.apiId);

        this.logger.info(`APIGW - Removing api: ${curApi.apiId}`);
        await this.request({
          Action: 'DeleteApi',
          apiId: curApi.apiId,
          serviceId,
        });
      }

      // unrelease service
      // get environment list
      const { environmentList } = await this.request({
        Action: 'DescribeServiceEnvironmentList',
        serviceId,
      });

      for (let i = 0; i < environmentList.length; i++) {
        const { environmentName, status } = environmentList[i];
        if (status === 1) {
          try {
            this.logger.info(
              `APIGW - Unreleasing service: ${serviceId}, environment: ${environmentName}`,
            );
            await this.request({
              Action: 'UnReleaseService',
              serviceId,
              environmentName,
              unReleaseDesc: 'Offlined By Serverless Framework',
            });
          } catch (e) {}
        }
      }

      // delete service
      this.logger.info(`APIGW - Removing service: ${serviceId}`);
      await this.request({
        Action: 'DeleteService',
        serviceId,
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

module.exports = Apigw;
