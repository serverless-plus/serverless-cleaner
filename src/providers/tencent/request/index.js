function isEmpty(val) {
  return (
    val === undefined || val === null || (typeof val === 'number' && isNaN(val))
  );
}

function cleanEmptyValue(obj) {
  const newObj = {};
  for (const key in obj) {
    const val = obj[key];
    if (!isEmpty(val)) {
      newObj[key] = val;
    }
  }
  return newObj;
}

async function request(capi, inputs) {
  const reqData = cleanEmptyValue(inputs);
  const reqOptions = capi.options;
  const serviceType = reqOptions.ServiceType;

  const res = await capi.request(reqData, {
    isV3: reqOptions.isV3,
    debug: reqOptions.debug,
    RequestClient: 'ServerlessComponentV2',
    ServiceType: serviceType,
    host: reqOptions.host || `${serviceType}.tencentcloudapi.com`,
    path: reqOptions.path || '/',
  });
  const { Response } = res;
  if (Response && Response.Error && Response.Error.Code) {
    throw new Error(`${Response.Error.Message} (reqId: ${Response.RequestId})`);
  }
  return Response;
}

module.exports = { request };
