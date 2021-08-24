"use strict";

var util = require("util");
var request = require("request");
var url = require("url");
var events = require("events");

var WebSocket = require("ws");
var swagger = require("swagger-client");
var Promise = require("bluebird");

var _ = require("lodash");
var backoff = require("backoff-func");
var _resources = require("./resources.js");

function Client(baseUrl, user, pass) {
    var self = this;
    events.EventEmitter.call(self);

    var parsedUrl = url.parse(baseUrl);
    self._connection = {
        protocol: parsedUrl.protocol,
        host: parsedUrl.host,
        hostname: parsedUrl.hostname,
        user: user,
        pass: pass,
    };

    self._instanceListeners = {};
}

util.inherits(Client, events.EventEmitter);

Client.prototype._attachApi = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
        swagger.authorizations.add("basic-auth", new swagger.PasswordAuthorization(self._connection.hostname, self._connection.user, self._connection.pass));
        var ariUrl = util.format("%s//%s/ari/api-docs/resources.json", self._connection.protocol, self._connection.host);

        request(ariUrl, function (err) {
            if (err && ["ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED"].indexOf(err.code) !== -1) {
                err.name = "HostIsNotReachable";

                self.emit("APILoadError", err);
                reject(err);
            } else {
                self._swagger = new swagger.SwaggerApi({
                    url: ariUrl,
                    success: swaggerLoaded,
                    failure: swaggerFailed,
                });
            }
        });

        function swaggerLoaded() {
            if (self._swagger.ready === true) {
                _.each(_resources.knownTypes, attachResourceCreators);
                resolve(self);
            }
        }

        function swaggerFailed(err) {
            self.emit("APILoadError", err);
            reject(err);
        }

        function attachResourceCreators(resourceType) {
            self[resourceType] = function (id, values) {
                return _resources[resourceType](self, id, values);
            };
        }
    });
};

Client.prototype.start = function (apps, subscribeAll, callback) {
    var self = this;

    if (typeof subscribeAll === "function") {
        callback = subscribeAll;
        subscribeAll = null;
    }

    return new Promise(function (resolve, reject) {
        var applications = _.isArray(apps) ? apps.join(",") : apps;
        var wsUrl = util.format(
            "%s://%s/ari/events?app=%s&api_key=%s:%s",
            self._connection.protocol === "https:" ? "wss" : "ws",
            self._connection.host,
            applications,
            encodeURIComponent(self._connection.user),
            encodeURIComponent(self._connection.pass)
        );

        if (subscribeAll) {
            wsUrl += "&subscribeAll=true";
        }

        var retry = backoff.create({
            delay: 100,
        });

        connect();

        function connect() {
            self._ws = new WebSocket(wsUrl);
            self._ws.on("message", processMessage);
        }

        function processMessage(msg, flags) {
            var event = {};

            if (msg) {
                event = JSON.parse(msg);
            }
            var eventModels = self._swagger.apis.events.models;
            var eventModel = _.find(eventModels, function (item, key) {
                return key === event.type;
            });
            var resources = {};
            var instanceIds = [];

            //* 메시지가 오면, 그 메시지의 프로퍼티 속성을 확인하여 데이터 타입과 맞는지 체크한 후,, */
            _.each(eventModel.properties, function (prop) {
                if (_.includes(_resources.knownTypes, prop.dataType) && event[prop.name] !== undefined && _resources[prop.dataType] !== undefined) {
                    //* 리소스의 module.exports로 정의된 인스턴스 함수를 실행 */
                    var instance = _resources[prop.dataType](self, event[prop.name]);

                    //* 함수를 저장시킴 */
                    resources[prop.name] = instance;
                    var listeners = self._instanceListeners[event.type]; //* event.type: PlaybackStarted, PlaybackFinished
                    var instanceId = instance._id().toString(); //* 개별적인 아이디

                    if (listeners) {
                        var updatedListeners = [];

                        _.each(listeners, function (listener) {
                            if (listener.id === instanceId) {
                                if (!_.includes(instanceIds, instanceId)) {
                                    instanceIds.push(instanceId);
                                }

                                if (!listener.once) {
                                    updatedListeners.push(listener);
                                }
                            } else {
                                updatedListeners.push(listener);
                            }
                        });

                        self._instanceListeners[event.type] = updatedListeners;
                    }
                }
            });

            var promoted = _.keys(resources).length;
            if (promoted === 1) {
                resources = resources[_.keys(resources)];
            } else if (promoted === 0) {
                resources = undefined;
            }

            self.emit(event.type, event, resources);

            if (instanceIds.length > 0) {
                _.each(instanceIds, function (instanceId) {
                    self.emit(util.format("%s-%s", event.type, instanceId), event, resources);
                });
            }
        }
    }).asCallback(callback);
};

const connect = function (baseUrl, user, pass, callback) {
    var client = new Client(baseUrl, user, pass);
    client.setMaxListeners(0);

    return client._attachApi().asCallback(callback);
};

connect("http://localhost:8088", "asterisk", "asterisk", (err, client) => {
    client.start("channel-aa");
});
