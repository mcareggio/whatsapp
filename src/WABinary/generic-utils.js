"use strict";
exports.__esModule = true;
exports.binaryNodeToString = exports.getBinaryNodeMessages = exports.reduceBinaryNodeToDictionary = exports.assertNodeErrorFree = exports.getBinaryNodeChildUInt = exports.getBinaryNodeChildString = exports.getBinaryNodeChildBuffer = exports.getBinaryNodeChild = exports.getAllBinaryNodeChildren = exports.getBinaryNodeChildren = void 0;
var boom_1 = require("@hapi/boom");
var WAProto_1 = require("../../WAProto");
// some extra useful utilities
var getBinaryNodeChildren = function (node, childTag) {
    if (Array.isArray(node === null || node === void 0 ? void 0 : node.content)) {
        return node.content.filter(function (item) { return item.tag === childTag; });
    }
    return [];
};
exports.getBinaryNodeChildren = getBinaryNodeChildren;
var getAllBinaryNodeChildren = function (_a) {
    var content = _a.content;
    if (Array.isArray(content)) {
        return content;
    }
    return [];
};
exports.getAllBinaryNodeChildren = getAllBinaryNodeChildren;
var getBinaryNodeChild = function (node, childTag) {
    if (Array.isArray(node === null || node === void 0 ? void 0 : node.content)) {
        return node === null || node === void 0 ? void 0 : node.content.find(function (item) { return item.tag === childTag; });
    }
};
exports.getBinaryNodeChild = getBinaryNodeChild;
var getBinaryNodeChildBuffer = function (node, childTag) {
    var _a;
    var child = (_a = (0, exports.getBinaryNodeChild)(node, childTag)) === null || _a === void 0 ? void 0 : _a.content;
    if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
        return child;
    }
};
exports.getBinaryNodeChildBuffer = getBinaryNodeChildBuffer;
var getBinaryNodeChildString = function (node, childTag) {
    var _a;
    var child = (_a = (0, exports.getBinaryNodeChild)(node, childTag)) === null || _a === void 0 ? void 0 : _a.content;
    if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
        return Buffer.from(child).toString('utf-8');
    }
    else if (typeof child === 'string') {
        return child;
    }
};
exports.getBinaryNodeChildString = getBinaryNodeChildString;
var getBinaryNodeChildUInt = function (node, childTag, length) {
    var buff = (0, exports.getBinaryNodeChildBuffer)(node, childTag);
    if (buff) {
        return bufferToUInt(buff, length);
    }
};
exports.getBinaryNodeChildUInt = getBinaryNodeChildUInt;
var assertNodeErrorFree = function (node) {
    var errNode = (0, exports.getBinaryNodeChild)(node, 'error');
    if (errNode) {
        throw new boom_1.Boom(errNode.attrs.text || 'Unknown error', { data: +errNode.attrs.code });
    }
};
exports.assertNodeErrorFree = assertNodeErrorFree;
var reduceBinaryNodeToDictionary = function (node, tag) {
    var nodes = (0, exports.getBinaryNodeChildren)(node, tag);
    var dict = nodes.reduce(function (dict, _a) {
        var attrs = _a.attrs;
        dict[attrs.name || attrs.config_code] = attrs.value || attrs.config_value;
        return dict;
    }, {});
    return dict;
};
exports.reduceBinaryNodeToDictionary = reduceBinaryNodeToDictionary;
var getBinaryNodeMessages = function (_a) {
    var content = _a.content;
    var msgs = [];
    if (Array.isArray(content)) {
        for (var _i = 0, content_1 = content; _i < content_1.length; _i++) {
            var item = content_1[_i];
            if (item.tag === 'message') {
                msgs.push(WAProto_1.proto.WebMessageInfo.decode(item.content));
            }
        }
    }
    return msgs;
};
exports.getBinaryNodeMessages = getBinaryNodeMessages;
function bufferToUInt(e, t) {
    var a = 0;
    for (var i = 0; i < t; i++) {
        a = 256 * a + e[i];
    }
    return a;
}
var tabs = function (n) { return '\t'.repeat(n); };
function binaryNodeToString(node, i) {
    if (i === void 0) { i = 0; }
    if (!node) {
        return node;
    }
    if (typeof node === 'string') {
        return tabs(i) + node;
    }
    if (node instanceof Uint8Array) {
        return tabs(i) + Buffer.from(node).toString('hex');
    }
    if (Array.isArray(node)) {
        return node.map(function (x) { return tabs(i + 1) + binaryNodeToString(x, i + 1); }).join('\n');
    }
    var children = binaryNodeToString(node.content, i + 1);
    var tag = "<".concat(node.tag, " ").concat(Object.entries(node.attrs || {})
        .filter(function (_a) {
        var v = _a[1];
        return v !== undefined;
    })
        .map(function (_a) {
        var k = _a[0], v = _a[1];
        return "".concat(k, "='").concat(v, "'");
    })
        .join(' '));
    var content = children ? ">\n".concat(children, "\n").concat(tabs(i), "</").concat(node.tag, ">") : '/>';
    return tag + content;
}
exports.binaryNodeToString = binaryNodeToString;
