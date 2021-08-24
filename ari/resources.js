"use strict";

var util = require("util");

var _ = require("lodash");
var uuid = require("uuid");
var Promise = require("bluebird");

var _utils = require("./utils.js");

var knownTypes = ["Application", "Asterisk", "Channel", "Bridge", "DeviceState", "Endpoint", "LiveRecording", "Mailbox", "Playback", "Sound", "StoredRecording"];
var swaggerListTypeRegex = /List\[([A-Za-z]+)\]/;

function Resource(client, id, objValues) {
    var self = this;
    self._client = client;

    if (!objValues) {
        objValues = id;
    }

    _.each(_.keys(objValues), function (key) {
        self[key] = objValues[key];
    });

    if (!objValues) {
        self.generateId();
    }

    if (_.isString(id)) {
        self._id(id);
        self._generatedId = true;
    }
}

Resource.prototype.generateId = function () {
    var self = this;
    var id = uuid.v4();

    self._id(id);
    self._generatedId = true;
};

Resource.prototype.one = function (event, callback) {
    var self = this;
    var id = self._id() && self._id().toString();
    var listeners = self._client._instanceListeners;

    if (!listeners[event]) {
        listeners[event] = [];
    }

    listeners[event].push({ once: false, id: id, callback: callback });
    self._client.on(util.format("%s-%s", event, id), callback);
};

Resource.prototype.once = function (event, callback) {
    var self = this;
    var id = self._id() && self._id().toString();
    var listeners = self._client._instanceListeners;

    // register event for this instance
    if (!listeners[event]) {
        listeners[event] = [];
    }

    listeners[event].push({ once: true, id: id, callback: callback });
    self._client.once(util.format("%s-%s", event, id), callback);
};

Resource.prototype.addListener = Resource.prototype.on;

Resource.prototype.removeListener = function (event, callback) {
    var self = this;
    var id = self._id() && self._id().toString();
    var listeners = self._client._instanceListeners;

    if (listeners[event]) {
        var updatedListeners = _.filter(listeners[event], function (listener) {
            return listener.id !== id || listener.callback !== callback;
        });
        var instanceListeners = _.filter(listeners[event], function (listener) {
            return listener.id === id && listener.callback === callback;
        });
        // if multiple, remove the last listener registered
        if (instanceListeners.length) {
            Array.prototype.push.apply(updatedListeners, instanceListeners);
            updatedListeners.splice(-1);
        }

        self._client._instanceListeners[event] = updatedListeners;
    }
};

Resource.prototype.removeAllListeners = function (event) {
    var self = this;
    var id = self._id() && self._id().toString();
    var listeners = self._client._instanceListeners;

    if (listeners[event]) {
        var updatedListeners = _.filter(listeners[event], function (listener) {
            return listener.id !== id;
        });

        self._client._instanceListeners[event] = updatedListeners;
    }
};

function Application(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(Application, Resource);

Application.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.name = value;
    } else {
        return self.name;
    }
};

Application.prototype._param = "applicationName";

Application.prototype._resource = "applications";

function Asterisk(client, objValues) {
    var self = this;
    Resource.call(self, client, undefined, objValues);
}

util.inherits(Asterisk, Resource);

Asterisk.prototype._param = "";

Asterisk.prototype._resource = "asterisk";

function Bridge(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(Bridge, Resource);

Bridge.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.id = value;
    } else {
        return self.id;
    }
};

Bridge.prototype._param = "bridgeId";
Bridge.prototype._resource = "bridges";
Bridge.prototype._createMethods = {
    create: {
        param: Bridge.prototype._param,
    },
    // this is not currently supported in ARI
    play: {
        param: "playbackId",
        requiresInstance: true,
    },
    record: {
        param: "name",
        requiresInstance: true,
    },
};

function Channel(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(Channel, Resource);

Channel.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.id = value;
    } else {
        return self.id;
    }
};

Channel.prototype._param = "channelId";

Channel.prototype._resource = "channels";

Channel.prototype._createMethods = {
    create: {
        param: Channel.prototype._param,
    },
    originate: {
        param: Channel.prototype._param,
    },
    snoopChannel: {
        param: "snoopId",
        requiresInstance: true,
    },
    play: {
        param: "playbackId",
        requiresInstance: true,
    },
    record: {
        param: "name",
        requiresInstance: true,
    },
    externalMedia: {
        param: Channel.prototype._param,
    },
};

/**
 *  DeviceState object for deviceState API responses.
 *
 *  @class DeviceState
 *  @constructor
 *  @extends Resource
 *  @param {Client} client - ARI client instance
 *  @param {string} id - Application identifier
 *  @param {Object} objValues - ownProperties to copy to the instance
 */
function DeviceState(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(DeviceState, Resource);

/**
 *  Get or set id for the deviceState.
 *
 *  @method _id
 *  @memberof module:resources~DeviceState
 *  @param {string} value - value to assign to the id property
 */
DeviceState.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.name = value;
    } else {
        return self.name;
    }
};

/**
 *  The name of the identifier field used when passing as parameter.
 *
 *  @member {string} _param
 *  @memberof module:resources~DeviceState
 */
DeviceState.prototype._param = "deviceName";
/**
 *  The name of this resource.
 *
 *  @member {string} _resource
 *  @memberof module:resources~DeviceState
 */
DeviceState.prototype._resource = "deviceStates";

/**
 *  Endpoint object for endpoint API responses.
 *
 *  @class Endpoint
 *  @constructor
 *  @extends Resource
 *  @param {Client} client - ARI client instance
 *  @param {string} id - Application identifier
 *  @param {Object} objValues - ownProperties to copy to the instance
 */
function Endpoint(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(Endpoint, Resource);

/**
 *  Get or set id for the endpoint.
 *
 *  @method _id
 *  @memberof module:resources~Endpoint
 *  @param {string} value - value to assign to the id property
 */
Endpoint.prototype._id = function (value) {
    var self = this;
    // multi field id
    if (value) {
        self.technology = value.technology;
        self.resource = value.resource;
    } else {
        return {
            tech: self.technology,
            resource: self.resource,
            toString: function () {
                return util.format("%s/%s", self.technology, self.resource);
            },
        };
    }
};

/**
 *  The name of the identifier field used when passing as parameter.
 *
 *  @member {string} _param
 *  @memberof module:resources~Endpoint
 */
Endpoint.prototype._param = ["tech", "resource"];
/**
 *  The name of this resource.
 *
 *  @member {string} _resource
 *  @memberof module:resources~Endpoint
 */
Endpoint.prototype._resource = "endpoints";

/**
 *  LiveRecording object for liveRecording API responses.
 *
 *  @class LiveRecording
 *  @constructor
 *  @extends Resource
 *  @param {Client} client - ARI client instance
 *  @param {string} id - Application identifier
 *  @param {Object} objValues - ownProperties to copy to the instance
 */
function LiveRecording(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(LiveRecording, Resource);

/**
 *  Get or set id for the liveRecording.
 *
 *  @method _id
 *  @memberof module:resources~LiveRecording
 *  @param {string} value - value to assign to the id property
 */
LiveRecording.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.name = value;
    } else {
        return self.name;
    }
};

/**
 *  The name of the identifier field used when passing as parameter.
 *
 *  @member {string} _param
 *  @memberof module:resources~LiveRecording
 */
LiveRecording.prototype._param = "recordingName";
/**
 *  The name of this resource.
 *
 *  @member {string} _resource
 *  @memberof module:resources~LiveRecording
 */
LiveRecording.prototype._resource = "recordings";

/**
 *  Mailbox object for mailbox API responses.
 *
 *  @class Mailbox
 *  @constructor
 *  @extends Resource
 *  @param {Client} client - ARI client instance
 *  @param {string} id - Application identifier
 *  @param {Object} objValues - ownProperties to copy to the instance
 */
function Mailbox(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(Mailbox, Resource);

/**
 *  Get or set id for the mailbox.
 *
 *  @method _id
 *  @memberof module:resources~Mailbox
 *  @param {string} value - value to assign to the id property
 */
Mailbox.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.name = value;
    } else {
        return self.name;
    }
};

/**
 *  The name of the identifier field used when passing as parameter..
 *
 *  @member {string} _param
 *  @memberof module:resources~Mailbox
 */
Mailbox.prototype._param = "mailboxName";
/**
 *  The name of this resource. .
 *
 *  @member {string} _resource
 *  @memberof module:resources~Mailbox
 */
Mailbox.prototype._resource = "mailboxes";

function Playback(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(Playback, Resource);
Playback.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.id = value;
    } else {
        return self.id;
    }
};

Playback.prototype._param = "playbackId";
Playback.prototype._resource = "playbacks";

function Sound(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(Sound, Resource);

/**
 *  Get or set id for the sound.
 *
 *  @method _id
 *  @memberof module:resources~Sound
 *  @param {string} value - value to assign to the id property
 */
Sound.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.id = value;
    } else {
        return self.id;
    }
};

/**
 *  The name of the identifier field used when passing as parameter.
 *
 *  @member {string} _param
 *  @memberof module:resources~Sound
 */
Sound.prototype._param = "soundId";
/**
 *  The name of this resource.
 *
 *  @member {string} _resource
 *  @memberof module:resources~Sound
 */
Sound.prototype._resource = "sounds";

/**
 *  StoredRecording object for storedRecording API responses.
 *
 *  @class StoredRecording
 *  @constructor
 *  @extends Resource
 *  @param {Client} client - ARI client instance
 *  @param {string} id - Application identifier
 *  @param {Object} objValues - ownProperties to copy to the instance
 */
function StoredRecording(client, id, objValues) {
    var self = this;
    Resource.call(self, client, id, objValues);
}

util.inherits(StoredRecording, Resource);

/**
 *  Get or set id for the storedRecording.
 *
 *  @method _id
 *  @memberof module:resources~StoredRecording
 *  @param {string} value - value to assign to the id property
 */
StoredRecording.prototype._id = function (value) {
    var self = this;
    if (value) {
        self.name = value;
    } else {
        return self.name;
    }
};

StoredRecording.prototype._param = "recordingName";
StoredRecording.prototype._resource = "recordings";

//* Channel, StoredRecording 등 각각의 인스턴스의 operation들을 등록한다.
function attachOperations() {
    var self = this;
    var operations = self._client._swagger.apis[self._resource].operations;

    //* 각각의 오퍼레이션들을 하나하나씩 찾아서 attachOperation() 함수에 불러오고,
    _.each(_.keys(operations), attachOperation);

    function attachOperation(operation) {
        self[operation] = HelloSwagger;
        var oper = self._client._swagger.apis[self._resource].operations[operation];
        var respType = oper.type;
        var multi = false;
        var regexArr = swaggerListTypeRegex.exec(respType);
        if (regexArr !== null) {
            respType = regexArr[1];
            multi = true;
        }
        var params = oper.parameters;

        function HelloSwagger() {
            var args = _.toArray(arguments);
            var options = _.first(args);
            var createInstance = args[1];
            var userCallback = _.isFunction(_.last(args)) ? _.last(args) : undefined;

            return new Promise(function (resolve, reject) {
                args = [];

                if (options === undefined || options === null || _.isFunction(options) || _.isArray(options)) {
                    options = {};
                }
                //* 필요한 파라미터를 받아서 options에 넣는다.
                _.each(params, function (param) {
                    var expectedParam = param.name;
                    var actualParam = self._param;

                    if (_.isArray(actualParam)) {
                        actualParam = _.find(actualParam, function (candidate) {
                            return candidate === expectedParam;
                        });
                    }

                    if (expectedParam === actualParam && param.required) {
                        var identifier = self._id() || "";
                        options[expectedParam] = identifier[expectedParam] || identifier;
                    }
                });

                //* api 메소드에 필요한 id를 의존할 경우
                //* 예를들어 Channel의 playback 메소드가 Channel의 id를 필요로 하는 경우.
                if (_.includes(_.keys(self._createMethods), operation)) {
                    var createMethod = self._createMethods[operation];
                    if (createMethod.requiresInstance) {
                        if (createInstance instanceof Resource && createInstance._generatedId) {
                            options[createMethod.param] = createInstance._id();
                        }
                    } else if (self._generatedId) {
                        options[createMethod.param] = self._id();
                    }
                }

                args.push(options);
                args.push(processResponse);
                args.push(swaggerError);

                //* 실행
                self._client._swagger.apis[self._resource][operation].apply(null, args);

                function swaggerError(err) {
                    if (err && err.data) {
                        err = new Error(err.data.toString("utf-8"));
                    }

                    reject(err);
                }

                function processResponse(response) {
                    var result = response.data.toString("utf-8");
                    if (respType !== null && result) {
                        result = JSON.parse(result);
                    }

                    //* 타입이 knownTypes에 포함되는 경우 그 객체를 다시 사용할수 있도록 함
                    if (_.includes(knownTypes, respType) && module.exports[respType] !== undefined) {
                        if (multi) {
                            result = _.map(result, function (obj) {
                                return module.exports[respType](self._client, obj);
                            });
                        } else {
                            result = module.exports[respType](self._client, result);
                        }
                    }
                    resolve(result);
                }
            }).asCallback(userCallback);
        }
    }
}

module.exports.knownTypes = knownTypes;
module.exports.swaggerListTypeRegex = swaggerListTypeRegex;
module.exports.Application = function (client, id, objValues) {
    var application = new Application(client, id, objValues);
    attachOperations.call(application);
    return application;
};
module.exports.Asterisk = function (client, objValues) {
    var asterisk = new Asterisk(client, objValues);
    attachOperations.call(asterisk);
    return asterisk;
};
module.exports.Bridge = function (client, id, objValues) {
    var bridge = new Bridge(client, id, objValues);
    attachOperations.call(bridge);
    return bridge;
};
module.exports.Channel = function (client, id, objValues) {
    var channel = new Channel(client, id, objValues);
    attachOperations.call(channel);
    return channel;
};
module.exports.DeviceState = function (client, id, objValues) {
    var deviceState = new DeviceState(client, id, objValues);
    attachOperations.call(deviceState);
    return deviceState;
};
module.exports.Endpoint = function (client, id, objValues) {
    var endpoint = new Endpoint(client, id, objValues);
    attachOperations.call(endpoint);
    return endpoint;
};
module.exports.LiveRecording = function (client, id, objValues) {
    var liveRecording = new LiveRecording(client, id, objValues);
    attachOperations.call(liveRecording);
    return liveRecording;
};
module.exports.Mailbox = function (client, id, objValues) {
    var mailbox = new Mailbox(client, id, objValues);
    attachOperations.call(mailbox);
    return mailbox;
};
module.exports.Playback = function (client, id, objValues) {
    var playback = new Playback(client, id, objValues);
    attachOperations.call(playback);
    return playback;
};

module.exports.HelloWorld = function () {
    console.log("gdgd");
};
module.exports.Sound = function (client, id, objValues) {
    var sound = new Sound(client, id, objValues);
    attachOperations.call(sound);
    return sound;
};
module.exports.StoredRecording = function (client, id, objValues) {
    var storedRecording = new StoredRecording(client, id, objValues);
    attachOperations.call(storedRecording);
    return storedRecording;
};
