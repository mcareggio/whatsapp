"use strict";
exports.__esModule = true;
exports.encodeBinaryNode = void 0;
var constants = require("./constants");
var jid_utils_1 = require("./jid-utils");
var encodeBinaryNode = function (node, opts, buffer) {
    if (opts === void 0) { opts = constants; }
    if (buffer === void 0) { buffer = [0]; }
    var encoded = encodeBinaryNodeInner(node, opts, buffer);
    return Buffer.from(encoded);
};
exports.encodeBinaryNode = encodeBinaryNode;
var encodeBinaryNodeInner = function (_a, opts, buffer) {
    var tag = _a.tag, attrs = _a.attrs, content = _a.content;
    var TAGS = opts.TAGS, TOKEN_MAP = opts.TOKEN_MAP;
    var pushByte = function (value) { return buffer.push(value & 0xff); };
    var pushInt = function (value, n, littleEndian) {
        if (littleEndian === void 0) { littleEndian = false; }
        for (var i = 0; i < n; i++) {
            var curShift = littleEndian ? i : n - 1 - i;
            buffer.push((value >> (curShift * 8)) & 0xff);
        }
    };
    var pushBytes = function (bytes) { return (bytes.forEach(function (b) { return buffer.push(b); })); };
    var pushInt16 = function (value) {
        pushBytes([(value >> 8) & 0xff, value & 0xff]);
    };
    var pushInt20 = function (value) { return (pushBytes([(value >> 16) & 0x0f, (value >> 8) & 0xff, value & 0xff])); };
    var writeByteLength = function (length) {
        if (length >= 4294967296) {
            throw new Error('string too large to encode: ' + length);
        }
        if (length >= 1 << 20) {
            pushByte(TAGS.BINARY_32);
            pushInt(length, 4); // 32 bit integer
        }
        else if (length >= 256) {
            pushByte(TAGS.BINARY_20);
            pushInt20(length);
        }
        else {
            pushByte(TAGS.BINARY_8);
            pushByte(length);
        }
    };
    var writeStringRaw = function (str) {
        var bytes = Buffer.from(str, 'utf-8');
        writeByteLength(bytes.length);
        pushBytes(bytes);
    };
    var writeJid = function (_a) {
        var domainType = _a.domainType, device = _a.device, user = _a.user, server = _a.server;
        if (typeof device !== 'undefined') {
            pushByte(TAGS.AD_JID);
            pushByte(domainType || 0);
            pushByte(device || 0);
            writeString(user);
        }
        else {
            pushByte(TAGS.JID_PAIR);
            if (user.length) {
                writeString(user);
            }
            else {
                pushByte(TAGS.LIST_EMPTY);
            }
            writeString(server);
        }
    };
    var packNibble = function (char) {
        switch (char) {
            case '-':
                return 10;
            case '.':
                return 11;
            case '\0':
                return 15;
            default:
                if (char >= '0' && char <= '9') {
                    return char.charCodeAt(0) - '0'.charCodeAt(0);
                }
                throw new Error("invalid byte for nibble \"".concat(char, "\""));
        }
    };
    var packHex = function (char) {
        if (char >= '0' && char <= '9') {
            return char.charCodeAt(0) - '0'.charCodeAt(0);
        }
        if (char >= 'A' && char <= 'F') {
            return 10 + char.charCodeAt(0) - 'A'.charCodeAt(0);
        }
        if (char >= 'a' && char <= 'f') {
            return 10 + char.charCodeAt(0) - 'a'.charCodeAt(0);
        }
        if (char === '\0') {
            return 15;
        }
        throw new Error("Invalid hex char \"".concat(char, "\""));
    };
    var writePackedBytes = function (str, type) {
        if (str.length > TAGS.PACKED_MAX) {
            throw new Error('Too many bytes to pack');
        }
        pushByte(type === 'nibble' ? TAGS.NIBBLE_8 : TAGS.HEX_8);
        var roundedLength = Math.ceil(str.length / 2.0);
        if (str.length % 2 !== 0) {
            roundedLength |= 128;
        }
        pushByte(roundedLength);
        var packFunction = type === 'nibble' ? packNibble : packHex;
        var packBytePair = function (v1, v2) {
            var result = (packFunction(v1) << 4) | packFunction(v2);
            return result;
        };
        var strLengthHalf = Math.floor(str.length / 2);
        for (var i = 0; i < strLengthHalf; i++) {
            pushByte(packBytePair(str[2 * i], str[2 * i + 1]));
        }
        if (str.length % 2 !== 0) {
            pushByte(packBytePair(str[str.length - 1], '\x00'));
        }
    };
    var isNibble = function (str) {
        if (str.length > TAGS.PACKED_MAX) {
            return false;
        }
        for (var i = 0; i < str.length; i++) {
            var char = str[i];
            var isInNibbleRange = char >= '0' && char <= '9';
            if (!isInNibbleRange && char !== '-' && char !== '.') {
                return false;
            }
        }
        return true;
    };
    var isHex = function (str) {
        if (str.length > TAGS.PACKED_MAX) {
            return false;
        }
        for (var i = 0; i < str.length; i++) {
            var char = str[i];
            var isInNibbleRange = char >= '0' && char <= '9';
            if (!isInNibbleRange && !(char >= 'A' && char <= 'F') && !(char >= 'a' && char <= 'f')) {
                return false;
            }
        }
        return true;
    };
    var writeString = function (str) {
        var tokenIndex = TOKEN_MAP[str];
        if (tokenIndex) {
            if (typeof tokenIndex.dict === 'number') {
                pushByte(TAGS.DICTIONARY_0 + tokenIndex.dict);
            }
            pushByte(tokenIndex.index);
        }
        else if (isNibble(str)) {
            writePackedBytes(str, 'nibble');
        }
        else if (isHex(str)) {
            writePackedBytes(str, 'hex');
        }
        else if (str) {
            var decodedJid = (0, jid_utils_1.jidDecode)(str);
            if (decodedJid) {
                writeJid(decodedJid);
            }
            else {
                writeStringRaw(str);
            }
        }
    };
    var writeListStart = function (listSize) {
        if (listSize === 0) {
            pushByte(TAGS.LIST_EMPTY);
        }
        else if (listSize < 256) {
            pushBytes([TAGS.LIST_8, listSize]);
        }
        else {
            pushByte(TAGS.LIST_16);
            pushInt16(listSize);
        }
    };
    var validAttributes = Object.keys(attrs).filter(function (k) { return (typeof attrs[k] !== 'undefined' && attrs[k] !== null); });
    writeListStart(2 * validAttributes.length + 1 + (typeof content !== 'undefined' ? 1 : 0));
    writeString(tag);
    for (var _i = 0, validAttributes_1 = validAttributes; _i < validAttributes_1.length; _i++) {
        var key = validAttributes_1[_i];
        if (typeof attrs[key] === 'string') {
            writeString(key);
            writeString(attrs[key]);
        }
    }
    if (typeof content === 'string') {
        writeString(content);
    }
    else if (Buffer.isBuffer(content) || content instanceof Uint8Array) {
        writeByteLength(content.length);
        pushBytes(content);
    }
    else if (Array.isArray(content)) {
        writeListStart(content.length);
        for (var _b = 0, content_1 = content; _b < content_1.length; _b++) {
            var item = content_1[_b];
            encodeBinaryNodeInner(item, opts, buffer);
        }
    }
    else if (typeof content === 'undefined') {
        // do nothing
    }
    else {
        throw new Error("invalid children for header \"".concat(tag, "\": ").concat(content, " (").concat(typeof content, ")"));
    }
    return buffer;
};
