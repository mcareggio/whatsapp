"use strict";
exports.__esModule = true;
exports.jidNormalizedUser = exports.isJidNewsletter = exports.isJidStatusBroadcast = exports.isJidGroup = exports.isJidBroadcast = exports.isLidUser = exports.isJidUser = exports.areJidsSameUser = exports.jidDecode = exports.jidEncode = exports.STORIES_JID = exports.PSA_WID = exports.SERVER_JID = exports.OFFICIAL_BIZ_JID = exports.S_WHATSAPP_NET = void 0;
exports.S_WHATSAPP_NET = '@s.whatsapp.net';
exports.OFFICIAL_BIZ_JID = '16505361212@c.us';
exports.SERVER_JID = 'server@c.us';
exports.PSA_WID = '0@c.us';
exports.STORIES_JID = 'status@broadcast';
var jidEncode = function (user, server, device, agent) {
    return "".concat(user || '').concat(!!agent ? "_".concat(agent) : '').concat(!!device ? ":".concat(device) : '', "@").concat(server);
};
exports.jidEncode = jidEncode;
var jidDecode = function (jid) {
    var sepIdx = typeof jid === 'string' ? jid.indexOf('@') : -1;
    if (sepIdx < 0) {
        return undefined;
    }
    var server = jid.slice(sepIdx + 1);
    var userCombined = jid.slice(0, sepIdx);
    var _a = userCombined.split(':'), userAgent = _a[0], device = _a[1];
    var user = userAgent.split('_')[0];
    return {
        server: server,
        user: user,
        domainType: server === 'lid' ? 1 : 0,
        device: device ? +device : undefined
    };
};
exports.jidDecode = jidDecode;
/** is the jid a user */
var areJidsSameUser = function (jid1, jid2) {
    var _a, _b;
    return (((_a = (0, exports.jidDecode)(jid1)) === null || _a === void 0 ? void 0 : _a.user) === ((_b = (0, exports.jidDecode)(jid2)) === null || _b === void 0 ? void 0 : _b.user));
};
exports.areJidsSameUser = areJidsSameUser;
/** is the jid a user */
var isJidUser = function (jid) { return (jid === null || jid === void 0 ? void 0 : jid.endsWith('@s.whatsapp.net')); };
exports.isJidUser = isJidUser;
/** is the jid a group */
var isLidUser = function (jid) { return (jid === null || jid === void 0 ? void 0 : jid.endsWith('@lid')); };
exports.isLidUser = isLidUser;
/** is the jid a broadcast */
var isJidBroadcast = function (jid) { return (jid === null || jid === void 0 ? void 0 : jid.endsWith('@broadcast')); };
exports.isJidBroadcast = isJidBroadcast;
/** is the jid a group */
var isJidGroup = function (jid) { return (jid === null || jid === void 0 ? void 0 : jid.endsWith('@g.us')); };
exports.isJidGroup = isJidGroup;
/** is the jid the status broadcast */
var isJidStatusBroadcast = function (jid) { return jid === 'status@broadcast'; };
exports.isJidStatusBroadcast = isJidStatusBroadcast;
/** is the jid a newsletter */
var isJidNewsletter = function (jid) { return (jid === null || jid === void 0 ? void 0 : jid.endsWith('@newsletter')); };
exports.isJidNewsletter = isJidNewsletter;
var jidNormalizedUser = function (jid) {
    var result = (0, exports.jidDecode)(jid);
    if (!result) {
        return '';
    }
    var user = result.user, server = result.server;
    return (0, exports.jidEncode)(user, server === 'c.us' ? 's.whatsapp.net' : server);
};
exports.jidNormalizedUser = jidNormalizedUser;
