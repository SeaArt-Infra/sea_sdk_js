export function withHeader(key, value) {
  return { headers: { [key]: value } };
}

export function withHeaders(headers) {
  return { headers: headers ?? {} };
}

export function buildRequestOptions(options = []) {
  const headers = {};
  for (const option of options) {
    if (!option) {
      continue;
    }
    const source = option.headers ?? option;
    for (const [key, value] of headerEntries(source)) {
      if (value === undefined || value === null) {
        continue;
      }
      headers[key] = Array.isArray(value) ? value.map(String) : String(value);
    }
  }
  return { headers };
}

function headerEntries(source) {
  if (source instanceof Headers) {
    return Array.from(source.entries());
  }
  return Object.entries(source).filter(([key]) => !['signal', 'interval', 'timeout', 'onUpdate'].includes(key));
}

export function withPollInterval(interval) {
  return { interval: durationToMilliseconds(interval, 'interval') };
}

export function withPollTimeout(timeout) {
  return { timeout: durationToMilliseconds(timeout, 'timeout') };
}

export function withPollCallback(onUpdate) {
  return { onUpdate };
}

export function applyPollOptions(options = []) {
  const config = {
    interval: 3000,
    timeout: 5 * 60 * 1000,
    onUpdate: undefined,
  };

  for (const option of options) {
    if (!option) {
      continue;
    }
    if (option.interval !== undefined) {
      config.interval = durationToMilliseconds(option.interval, 'interval');
    }
    if (option.timeout !== undefined) {
      config.timeout = durationToMilliseconds(option.timeout, 'timeout');
    }
    if (option.onUpdate !== undefined) {
      config.onUpdate = option.onUpdate;
    }
  }

  return config;
}

export function durationToMilliseconds(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive number of milliseconds`);
  }
  return value;
}
