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

  async removeAll({ exclude = [], include = [], LayerVersion = 'default' }) {
    if (exclude.length === 0 && include.length === 0) {
      this.logger.info(`LAYER - Nothing to remove`);
      return;
    }

    this.logger.info(`LAYER - Start remove layers`);
    if (include.length > 0) {
      for (let i = 0; i < include.length; i++) {
        await this.remove(include[i]);
      }
    } else {
      const { Layers } = await this.request({
        Action: 'ListLayers',
        Limit: 100,
      });

      for (let i = 0; i < Layers.length; i++) {
        const { LayerName } = Layers[i];
        if (exclude.indexOf(LayerName) === -1) {
          await this.remove(LayerName);
        } else {
          this.logger.info(`LAYER - Exclude LayerName: ${LayerName}`);
        }
      }
    }
    this.logger.info(`LAYER - Success remove layers`);
  }

  async remove(LayerName) {
    if (!LayerName) {
      return;
    }
    try {
      this.logger.info(`LAYER - Deleteing layer ${LayerName}`);
      const { LayerVersions } = await this.request({
        Action: 'ListLayerVersions',
        LayerName: LayerName,
      });

      if (LayerVersions && LayerVersions.length > 0) {
        for (let i = 0; i < LayerVersions.length; i++) {
          const { LayerVersion } = LayerVersions[i];
          await this.request({
            Action: 'DeleteLayerVersion',
            LayerName: LayerName,
            LayerVersion: LayerVersion,
          });
        }
      }
      this.logger.info(`LAYER - Removed layer ${LayerName} successfully`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}

module.exports = Cleaner;
