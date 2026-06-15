export class TaskBuilder {
  constructor(model) {
    this.request = {
      model,
      params: {},
      parameters: {},
      legacyInput: [],
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

  input(item) {
    this.request.legacyInput.push(item);
    return this;
  }

  Input(item) {
    return this.input(item);
  }

  user(...parts) {
    this.request.legacyInput.push(user(...parts));
    return this;
  }

  User(...parts) {
    return this.user(...parts);
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
    if (this.request.legacyInput.length > 0 && params.input === undefined) {
      params.input = this.request.legacyInput;
    }
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


export function user(...parts) {
  return {
    type: 'message',
    role: 'user',
    content: parts,
  };
}

export const User = user;

export function text(textValue) {
  return { type: 'text', text: textValue };
}

export const Text = text;

export function imageURL(url) {
  return { type: 'image_url', url };
}

export const ImageURL = imageURL;

export function videoURL(url) {
  return { type: 'video_url', url };
}

export const VideoURL = videoURL;

export function audioURL(url) {
  return { type: 'audio_url', url };
}

export const AudioURL = audioURL;

export function fileID(id, mime = '') {
  return mime ? { type: 'file_id', file_id: id, mime } : { type: 'file_id', file_id: id };
}

export const FileID = fileID;
