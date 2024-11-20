"use strict";
exports.__esModule = true;
exports.encodeWAM = void 0;
var constants_1 = require("./constants");
var getHeaderBitLength = function (key) { return (key < 256 ? 2 : 3); };
var encodeWAM = function (binaryInfo) {
    binaryInfo.buffer = [];
    encodeWAMHeader(binaryInfo);
    encodeEvents(binaryInfo);
    console.log(binaryInfo.buffer);
    var totalSize = binaryInfo.buffer
        .map(function (a) { return a.length; })
        .reduce(function (a, b) { return a + b; });
    var buffer = Buffer.alloc(totalSize);
    var offset = 0;
    binaryInfo.buffer.forEach(function (buffer_) {
        buffer_.copy(buffer, offset);
        offset += buffer_.length;
    });
    return buffer;
};
exports.encodeWAM = encodeWAM;
function encodeWAMHeader(binaryInfo) {
    var headerBuffer = Buffer.alloc(8); // starting buffer
    headerBuffer.write('WAM', 0, 'utf8');
    headerBuffer.writeUInt8(binaryInfo.protocolVersion, 3);
    headerBuffer.writeUInt8(1, 4); //random flag
    headerBuffer.writeUInt16BE(binaryInfo.sequence, 5);
    headerBuffer.writeUInt8(0, 7); // regular channel
    binaryInfo.buffer.push(headerBuffer);
}
function encodeGlobalAttributes(binaryInfo, globals) {
    var _loop_1 = function (key, _value) {
        var id = constants_1.WEB_GLOBALS.find(function (a) { return (a === null || a === void 0 ? void 0 : a.name) === key; }).id;
        var value = _value;
        if (typeof value === 'boolean') {
            value = value ? 1 : 0;
        }
        binaryInfo.buffer.push(serializeData(id, value, constants_1.FLAG_GLOBAL));
    };
    for (var _i = 0, _a = Object.entries(globals); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], _value = _b[1];
        _loop_1(key, _value);
    }
}
function encodeEvents(binaryInfo) {
    var _loop_2 = function (name_1, props, globals) {
        encodeGlobalAttributes(binaryInfo, globals);
        var event_1 = constants_1.WEB_EVENTS.find(function (a) { return a.name === name_1; });
        var props_ = Object.entries(props);
        var extended = false;
        for (var _d = 0, props_1 = props_; _d < props_1.length; _d++) {
            var _e = props_1[_d], value = _e[1];
            extended || (extended = value !== null);
        }
        var eventFlag = extended ? constants_1.FLAG_EVENT : constants_1.FLAG_EVENT | constants_1.FLAG_EXTENDED;
        binaryInfo.buffer.push(serializeData(event_1.id, -event_1.weight, eventFlag));
        for (var i = 0; i < props_.length; i++) {
            var _f = props_[i], key = _f[0], _value = _f[1];
            var id = (event_1.props)[key][0];
            extended = i < (props_.length - 1);
            var value = _value;
            if (typeof value === 'boolean') {
                value = value ? 1 : 0;
            }
            var fieldFlag = extended ? constants_1.FLAG_EVENT : constants_1.FLAG_FIELD | constants_1.FLAG_EXTENDED;
            binaryInfo.buffer.push(serializeData(id, value, fieldFlag));
        }
    };
    for (var _i = 0, _a = binaryInfo.events.map(function (a) { return Object.entries(a)[0]; }); _i < _a.length; _i++) {
        var _b = _a[_i], name_1 = _b[0], _c = _b[1], props = _c.props, globals = _c.globals;
        _loop_2(name_1, props, globals);
    }
}
function serializeData(key, value, flag) {
    var bufferLength = getHeaderBitLength(key);
    var buffer;
    var offset = 0;
    if (value === null) {
        if (flag === constants_1.FLAG_GLOBAL) {
            buffer = Buffer.alloc(bufferLength);
            offset = serializeHeader(buffer, offset, key, flag);
            return buffer;
        }
    }
    else if (typeof value === 'number' && Number.isInteger(value)) {
        // is number
        if (value === 0 || value === 1) {
            buffer = Buffer.alloc(bufferLength);
            offset = serializeHeader(buffer, offset, key, flag | ((value + 1) << 4));
            return buffer;
        }
        else if (-128 <= value && value < 128) {
            buffer = Buffer.alloc(bufferLength + 1);
            offset = serializeHeader(buffer, offset, key, flag | (3 << 4));
            buffer.writeInt8(value, offset);
            return buffer;
        }
        else if (-32768 <= value && value < 32768) {
            buffer = Buffer.alloc(bufferLength + 2);
            offset = serializeHeader(buffer, offset, key, flag | (4 << 4));
            buffer.writeInt16LE(value, offset);
            return buffer;
        }
        else if (-2147483648 <= value && value < 2147483648) {
            buffer = Buffer.alloc(bufferLength + 4);
            offset = serializeHeader(buffer, offset, key, flag | (5 << 4));
            buffer.writeInt32LE(value, offset);
            return buffer;
        }
        else {
            buffer = Buffer.alloc(bufferLength + 8);
            offset = serializeHeader(buffer, offset, key, flag | (7 << 4));
            buffer.writeDoubleLE(value, offset);
            return buffer;
        }
    }
    else if (typeof value === 'number') {
        // is float
        buffer = Buffer.alloc(bufferLength + 8);
        offset = serializeHeader(buffer, offset, key, flag | (7 << 4));
        buffer.writeDoubleLE(value, offset);
        return buffer;
    }
    else if (typeof value === 'string') {
        // is string
        var utf8Bytes = Buffer.byteLength(value, 'utf8');
        if (utf8Bytes < 256) {
            buffer = Buffer.alloc(bufferLength + 1 + utf8Bytes);
            offset = serializeHeader(buffer, offset, key, flag | (8 << 4));
            buffer.writeUint8(utf8Bytes, offset++);
        }
        else if (utf8Bytes < 65536) {
            buffer = Buffer.alloc(bufferLength + 2 + utf8Bytes);
            offset = serializeHeader(buffer, offset, key, flag | (9 << 4));
            buffer.writeUInt16LE(utf8Bytes, offset);
            offset += 2;
        }
        else {
            buffer = Buffer.alloc(bufferLength + 4 + utf8Bytes);
            offset = serializeHeader(buffer, offset, key, flag | (10 << 4));
            buffer.writeUInt32LE(utf8Bytes, offset);
            offset += 4;
        }
        buffer.write(value, offset, 'utf8');
        return buffer;
    }
    throw 'missing';
}
function serializeHeader(buffer, offset, key, flag) {
    if (key < 256) {
        buffer.writeUInt8(flag, offset);
        offset += 1;
        buffer.writeUInt8(key, offset);
        offset += 1;
    }
    else {
        buffer.writeUInt8(flag | constants_1.FLAG_BYTE, offset);
        offset += 1;
        buffer.writeUInt16LE(key, offset);
        offset += 2;
    }
    return offset;
}
