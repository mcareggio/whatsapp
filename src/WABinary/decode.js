"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.decodeBinaryNode = exports.decodeDecompressedBinaryNode = exports.decompressingIfRequired = void 0;
var util_1 = require("util");
var zlib_1 = require("zlib");
var constants = require("./constants");
var jid_utils_1 = require("./jid-utils");
var inflatePromise = (0, util_1.promisify)(zlib_1.inflate);
var decompressingIfRequired = function (buffer) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(2 & buffer.readUInt8())) return [3 /*break*/, 2];
                return [4 /*yield*/, inflatePromise(buffer.slice(1))];
            case 1:
                buffer = _a.sent();
                return [3 /*break*/, 3];
            case 2:
                buffer = buffer.slice(1);
                _a.label = 3;
            case 3: return [2 /*return*/, buffer];
        }
    });
}); };
exports.decompressingIfRequired = decompressingIfRequired;
var decodeDecompressedBinaryNode = function (buffer, opts, indexRef) {
    if (indexRef === void 0) { indexRef = { index: 0 }; }
    var DOUBLE_BYTE_TOKENS = opts.DOUBLE_BYTE_TOKENS, SINGLE_BYTE_TOKENS = opts.SINGLE_BYTE_TOKENS, TAGS = opts.TAGS;
    var checkEOS = function (length) {
        if (indexRef.index + length > buffer.length) {
            throw new Error('end of stream');
        }
    };
    var next = function () {
        var value = buffer[indexRef.index];
        indexRef.index += 1;
        return value;
    };
    var readByte = function () {
        checkEOS(1);
        return next();
    };
    var readBytes = function (n) {
        checkEOS(n);
        var value = buffer.slice(indexRef.index, indexRef.index + n);
        indexRef.index += n;
        return value;
    };
    var readStringFromChars = function (length) {
        return readBytes(length).toString('utf-8');
    };
    var readInt = function (n, littleEndian) {
        if (littleEndian === void 0) { littleEndian = false; }
        checkEOS(n);
        var val = 0;
        for (var i = 0; i < n; i++) {
            var shift = littleEndian ? i : n - 1 - i;
            val |= next() << (shift * 8);
        }
        return val;
    };
    var readInt20 = function () {
        checkEOS(3);
        return ((next() & 15) << 16) + (next() << 8) + next();
    };
    var unpackHex = function (value) {
        if (value >= 0 && value < 16) {
            return value < 10 ? '0'.charCodeAt(0) + value : 'A'.charCodeAt(0) + value - 10;
        }
        throw new Error('invalid hex: ' + value);
    };
    var unpackNibble = function (value) {
        if (value >= 0 && value <= 9) {
            return '0'.charCodeAt(0) + value;
        }
        switch (value) {
            case 10:
                return '-'.charCodeAt(0);
            case 11:
                return '.'.charCodeAt(0);
            case 15:
                return '\0'.charCodeAt(0);
            default:
                throw new Error('invalid nibble: ' + value);
        }
    };
    var unpackByte = function (tag, value) {
        if (tag === TAGS.NIBBLE_8) {
            return unpackNibble(value);
        }
        else if (tag === TAGS.HEX_8) {
            return unpackHex(value);
        }
        else {
            throw new Error('unknown tag: ' + tag);
        }
    };
    var readPacked8 = function (tag) {
        var startByte = readByte();
        var value = '';
        for (var i = 0; i < (startByte & 127); i++) {
            var curByte = readByte();
            value += String.fromCharCode(unpackByte(tag, (curByte & 0xf0) >> 4));
            value += String.fromCharCode(unpackByte(tag, curByte & 0x0f));
        }
        if (startByte >> 7 !== 0) {
            value = value.slice(0, -1);
        }
        return value;
    };
    var isListTag = function (tag) {
        return tag === TAGS.LIST_EMPTY || tag === TAGS.LIST_8 || tag === TAGS.LIST_16;
    };
    var readListSize = function (tag) {
        switch (tag) {
            case TAGS.LIST_EMPTY:
                return 0;
            case TAGS.LIST_8:
                return readByte();
            case TAGS.LIST_16:
                return readInt(2);
            default:
                throw new Error('invalid tag for list size: ' + tag);
        }
    };
    var readJidPair = function () {
        var i = readString(readByte());
        var j = readString(readByte());
        if (j) {
            return (i || '') + '@' + j;
        }
        throw new Error('invalid jid pair: ' + i + ', ' + j);
    };
    var readAdJid = function () {
        var agent = readByte();
        var device = readByte();
        var user = readString(readByte());
        return (0, jid_utils_1.jidEncode)(user, agent === 0 ? 's.whatsapp.net' : 'lid', device);
    };
    var readString = function (tag) {
        if (tag >= 1 && tag < SINGLE_BYTE_TOKENS.length) {
            return SINGLE_BYTE_TOKENS[tag] || '';
        }
        switch (tag) {
            case TAGS.DICTIONARY_0:
            case TAGS.DICTIONARY_1:
            case TAGS.DICTIONARY_2:
            case TAGS.DICTIONARY_3:
                return getTokenDouble(tag - TAGS.DICTIONARY_0, readByte());
            case TAGS.LIST_EMPTY:
                return '';
            case TAGS.BINARY_8:
                return readStringFromChars(readByte());
            case TAGS.BINARY_20:
                return readStringFromChars(readInt20());
            case TAGS.BINARY_32:
                return readStringFromChars(readInt(4));
            case TAGS.JID_PAIR:
                return readJidPair();
            case TAGS.AD_JID:
                return readAdJid();
            case TAGS.HEX_8:
            case TAGS.NIBBLE_8:
                return readPacked8(tag);
            default:
                throw new Error('invalid string with tag: ' + tag);
        }
    };
    var readList = function (tag) {
        var items = [];
        var size = readListSize(tag);
        for (var i = 0; i < size; i++) {
            items.push((0, exports.decodeDecompressedBinaryNode)(buffer, opts, indexRef));
        }
        return items;
    };
    var getTokenDouble = function (index1, index2) {
        var dict = DOUBLE_BYTE_TOKENS[index1];
        if (!dict) {
            throw new Error("Invalid double token dict (".concat(index1, ")"));
        }
        var value = dict[index2];
        if (typeof value === 'undefined') {
            throw new Error("Invalid double token (".concat(index2, ")"));
        }
        return value;
    };
    var listSize = readListSize(readByte());
    var header = readString(readByte());
    if (!listSize || !header.length) {
        throw new Error('invalid node');
    }
    var attrs = {};
    var data;
    if (listSize === 0 || !header) {
        throw new Error('invalid node');
    }
    // read the attributes in
    var attributesLength = (listSize - 1) >> 1;
    for (var i = 0; i < attributesLength; i++) {
        var key = readString(readByte());
        var value = readString(readByte());
        attrs[key] = value;
    }
    if (listSize % 2 === 0) {
        var tag = readByte();
        if (isListTag(tag)) {
            data = readList(tag);
        }
        else {
            var decoded = void 0;
            switch (tag) {
                case TAGS.BINARY_8:
                    decoded = readBytes(readByte());
                    break;
                case TAGS.BINARY_20:
                    decoded = readBytes(readInt20());
                    break;
                case TAGS.BINARY_32:
                    decoded = readBytes(readInt(4));
                    break;
                default:
                    decoded = readString(tag);
                    break;
            }
            data = decoded;
        }
    }
    return {
        tag: header,
        attrs: attrs,
        content: data
    };
};
exports.decodeDecompressedBinaryNode = decodeDecompressedBinaryNode;
var decodeBinaryNode = function (buff) { return __awaiter(void 0, void 0, void 0, function () {
    var decompBuff;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.decompressingIfRequired)(buff)];
            case 1:
                decompBuff = _a.sent();
                return [2 /*return*/, (0, exports.decodeDecompressedBinaryNode)(decompBuff, constants)];
        }
    });
}); };
exports.decodeBinaryNode = decodeBinaryNode;
