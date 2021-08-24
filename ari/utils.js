"use strict";
var _ = require("lodash");

function parseBodyParams(params, swaggerOptions) {
    var options = _.clone(swaggerOptions);
    var bodyParams = params.filter(function (param) {
        return param.paramType === "body";
    });

    bodyParams.forEach(function (bodyParam) {
        var jsonBody = options[bodyParam.name];
        if (jsonBody) {
            // variables behaves differently in that it expects a variables key to
            // wrap the key/value pairs
            if (bodyParam.name === "variables" && !options.variables.variables) {
                jsonBody = { variables: jsonBody };
            } else if (bodyParam.name === "fields" && !options.fields.fields) {
                jsonBody = { fields: jsonBody };
            }
            options.body = JSON.stringify(jsonBody);
            delete options[bodyParam.name];
        }
    });

    return options;
}

module.exports.parseBodyParams = parseBodyParams;
