export class TaskBuilder {
  constructor(model) {
    this.request = {
      model,
      input: [],
      parameters: {},
      metadata: {},
      options: {},
    };
  }

  input(item) {
    this.request.input.push(item);
    return this;
  }

  Input(item) {
    return this.input(item);
  }

  user(...parts) {
    this.request.input.push(user(...parts));
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

  build() {
    const body = { model: this.request.model };
    if (this.request.input.length > 0) {
      body.input = this.request.input;
    }
    if (Object.keys(this.request.parameters).length > 0) {
      body.parameters = this.request.parameters;
    }
    if (Object.keys(this.request.metadata).length > 0) {
      body.metadata = this.request.metadata;
    }
    if (Object.keys(this.request.options).length > 0) {
      body.options = this.request.options;
    }
    return body;
  }

  Build() {
    return this.build();
  }
}

export function newTask(model) {
  return new TaskBuilder(model);
}

export const NewTask = newTask;

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
