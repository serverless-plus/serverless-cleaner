const { Capi } = require('@tencent-sdk/capi');
const { request } = require('./request');

class Cleaner {
  constructor({ credentials = {}, region, logger = console }) {
    this.region = region || 'ap-guangzhou';
    this.credentials = credentials;
    this.logger = logger;
    this.capi = new Capi({
      ...this.credentials,
      ServiceType: 'apigateway',
      Version: '2018-08-08',
      Region: this.region,
      isV3: true,
      debug: false,
    });
  }

  async request(inputs) {
    try {
      const Response = await request(this.capi, inputs);
      return Response;
    } catch (e) {
      this.logger.error(`Request API ${inputs.Action} failed: ${e.message}`);
    }
  }

  async list(page = 0) {
    const limit = 100;
    const {
      Result: { ServiceSet },
    } = await this.request({
      Action: 'DescribeServicesStatus',
      Offset: page * limit,
      Limit: limit,
    });
    if (ServiceSet.length >= limit) {
      const res = await this.list(page + 1);
      return ServiceSet.concat(res);
    }
    return ServiceSet;
  }

  async removeAll({ exclude = [], include = [] }) {
    if (exclude.length === 0 && include.length === 0) {
      this.logger.info(`APIGW - Nothing to remove`);
      return;
    }

    this.logger.info(`APIGW - Start remove APIGW services`);
    if (include.length > 0) {
      for (let i = 0; i < include.length; i++) {
        await this.removeById(include[i]);
      }
    } else {
      const list = await this.list();

      for (let i = 0; i < list.length; i++) {
        const { ServiceId } = list[i];
        if (exclude.indexOf(ServiceId) === -1) {
          await this.removeById(ServiceId);
        } else {
          this.logger.info(`APIGW - Exclude serviceId: ${ServiceId}`);
        }
      }
    }
    // 删除所有使用计划
    await this.removeAllUsagePlan();
    this.logger.info(`APIGW - Success remove APIGW services`);
  }

  async removeApiUsagePlan(ServiceId) {
    const {
      Result: { ApiUsagePlanList },
    } = await this.request({
      Action: 'DescribeApiUsagePlan',
      ServiceId,
    });

    for (let i = 0; i < ApiUsagePlanList.length; i++) {
      const { UsagePlanId, Environment, ApiId } = ApiUsagePlanList[i];
      this.logger.info(`APIGW - Removing api usage plan: ${UsagePlanId}`);
      const {
        Result: { AccessKeyList },
      } = await this.request({
        Action: 'DescribeUsagePlanSecretIds',
        UsagePlanId: UsagePlanId,
        Limit: 100,
      });

      const AccessKeyIds = AccessKeyList.map((item) => item.SecretId);

      if (AccessKeyIds && AccessKeyIds.length > 0) {
        await this.request({
          Action: 'UnBindSecretIds',
          UsagePlanId: UsagePlanId,
          AccessKeyIds: AccessKeyIds,
        });
        // delelet all created api key
        for (let sIdx = 0; sIdx < AccessKeyIds.length; sIdx++) {
          await this.request({
            Action: 'DisableApiKey',
            AccessKeyId: AccessKeyIds[sIdx],
          });
        }
      }

      // unbind environment
      await this.request({
        Action: 'UnBindEnvironment',
        ServiceId,
        UsagePlanIds: [UsagePlanId],
        Environment: Environment,
        BindType: 'API',
        ApiIds: [ApiId],
      });

      await this.request({
        Action: 'DeleteUsagePlan',
        UsagePlanId: UsagePlanId,
      });
    }
  }

  async removeUsagePlanById(UsagePlanId) {
    this.logger.info(`APIGW - Removing usage plan: ${UsagePlanId}`);
    const {
      Result: { AccessKeyList },
    } = await this.request({
      Action: 'DescribeUsagePlanSecretIds',
      UsagePlanId: UsagePlanId,
      Limit: 100,
    });

    const AccessKeyIds = AccessKeyList.map((item) => item.AccessKeyId);

    if (AccessKeyIds && AccessKeyIds.length > 0) {
      await this.request({
        Action: 'UnBindSecretIds',
        UsagePlanId: UsagePlanId,
        AccessKeyIds: AccessKeyIds,
      });
      // delelet all created api key
      for (let sIdx = 0; sIdx < AccessKeyIds.length; sIdx++) {
        await this.request({
          Action: 'DisableApiKey',
          AccessKeyId: AccessKeyIds[sIdx],
        });
      }
    }

    await this.request({
      Action: 'DeleteUsagePlan',
      UsagePlanId: UsagePlanId,
    });
  }

  async removeServiceUsagePlan(ServiceId) {
    // remove bind usage plan
    const {
      Result: { ServiceUsagePlanList },
    } = await this.request({
      Action: 'DescribeServiceUsagePlan',
      ServiceId,
      Limit: 100,
    });

    for (let i = 0; i < ServiceUsagePlanList.length; i++) {
      const { UsagePlanId, Environment } = ServiceUsagePlanList[i];
      this.logger.info(`APIGW - Removing service usage plan: ${UsagePlanId}`);
      const {
        Result: { AccessKeyList },
      } = await this.request({
        Action: 'DescribeUsagePlanSecretIds',
        UsagePlanId: UsagePlanId,
        Limit: 100,
      });

      const AccessKeyIds = AccessKeyList.map((item) => item.SecretId);

      if (AccessKeyIds && AccessKeyIds.length > 0) {
        await this.request({
          Action: 'UnBindSecretIds',
          UsagePlanId: UsagePlanId,
          AccessKeyIds: AccessKeyIds,
        });
        // delelet all created api key
        for (let sIdx = 0; sIdx < AccessKeyIds.length; sIdx++) {
          await this.request({
            Action: 'DisableApiKey',
            AccessKeyId: AccessKeyIds[sIdx],
          });
        }
      }

      // unbind environment
      await this.request({
        Action: 'UnBindEnvironment',
        ServiceId,
        UsagePlanIds: [UsagePlanId],
        Environment: Environment,
        BindType: 'SERVICE',
      });

      await this.request({
        Action: 'DeleteUsagePlan',
        UsagePlanId: UsagePlanId,
      });
    }
  }

  async getUsagePlanList(page = 0) {
    const limit = 100;
    const {
      Result: { UsagePlanStatusSet },
    } = await this.request({
      Action: 'DescribeUsagePlansStatus',
      Offset: page * limit,
      Limit: limit,
    });
    if (UsagePlanStatusSet.length >= limit) {
      const res = await this.list(page + 1);
      return UsagePlanStatusSet.concat(res);
    }
    return UsagePlanStatusSet;
  }

  async removeAllUsagePlan() {
    try {
      const list = await this.getUsagePlanList();
      for (let i = 0, len = list.length; i < len; i++) {
        const cur = list[i];
        await this.removeUsagePlanById(cur.UsagePlanId);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  async removeById(ServiceId) {
    if (!ServiceId) {
      return;
    }
    try {
      await this.removeServiceUsagePlan(ServiceId);
      const {
        Result: { ApiIdStatusSet },
      } = await this.request({
        Action: 'DescribeApisStatus',
        ServiceId,
        Limit: 100,
      });

      // remove all apis
      for (let i = 0; i < ApiIdStatusSet.length; i++) {
        const { ApiId } = ApiIdStatusSet[i];

        await this.removeApiUsagePlan(ServiceId);

        this.logger.info(`APIGW - Removing api: ${ApiId}`);
        await this.request({
          Action: 'DeleteApi',
          ApiId,
          ServiceId,
        });
      }

      // unrelease service
      // get environment list
      const {
        Result: { EnvironmentList },
      } = await this.request({
        Action: 'DescribeServiceEnvironmentList',
        ServiceId,
      });

      for (let i = 0; i < EnvironmentList.length; i++) {
        const { EnvironmentName, Status } = EnvironmentList[i];
        if (Status === 1) {
          try {
            this.logger.info(
              `APIGW - Unreleasing service: ${ServiceId}, environment: ${EnvironmentName}`,
            );
            await this.request({
              Action: 'UnReleaseService',
              ServiceId,
              EnvironmentName,
            });
          } catch (e) {}
        }
      }

      // delete service
      this.logger.info(`APIGW - Removing service: ${ServiceId}`);
      await this.request({
        Action: 'DeleteService',
        ServiceId,
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

module.exports = Cleaner;
