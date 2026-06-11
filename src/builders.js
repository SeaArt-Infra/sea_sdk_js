export class TaskBuilder {
  constructor(model) {
    this.request = {
      model,
      params: {},
      parameters: {},
      metadata: {},
      options: {},
      extraTopLevel: {},
    };
  }

  params(value) {
    this.request.params = cloneObject(value);
    return this;
  }

  Params(value) {
    return this.params(value);
  }

  param(key, value) {
    this.request.parameters[key] = value;
    return this;
  }

  Param(key, value) {
    return this.param(key, value);
  }

  metadata(key, value) {
    this.request.metadata[key] = value;
    return this;
  }

  Metadata(key, value) {
    return this.metadata(key, value);
  }

  option(key, value) {
    this.request.options[key] = value;
    return this;
  }

  Option(key, value) {
    return this.option(key, value);
  }

  moderation(value) {
    this.request.moderation = Boolean(value);
    return this;
  }

  Moderation(value) {
    return this.moderation(value);
  }

  field(key, value) {
    this.request.extraTopLevel[key] = value;
    return this;
  }

  Field(key, value) {
    return this.field(key, value);
  }

  build() {
    const body = { model: this.request.model };
    if (this.request.moderation !== undefined) {
      body.moderation = this.request.moderation;
    }

    const params = cloneObject(this.request.params);
    if (Object.keys(this.request.parameters).length > 0) {
      params.parameters = {
        ...(isPlainObject(params.parameters) ? params.parameters : {}),
        ...this.request.parameters,
      };
    }
    if (Object.keys(params).length > 0) {
      body.input = [{ params }];
    }
    if (Object.keys(this.request.metadata).length > 0) {
      body.metadata = this.request.metadata;
    }
    if (Object.keys(this.request.options).length > 0) {
      body.options = this.request.options;
    }
    return {
      ...body,
      ...this.request.extraTopLevel,
    };
  }

  Build() {
    return this.build();
  }
}

export function newTask(model) {
  return new TaskBuilder(model);
}

export const NewTask = newTask;

function cloneObject(value) {
  if (!isPlainObject(value)) {
    return {};
  }
  return { ...value };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
