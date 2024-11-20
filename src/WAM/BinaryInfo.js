"use strict";
exports.__esModule = true;
exports.BinaryInfo = void 0;
var BinaryInfo = /** @class */ (function () {
    function BinaryInfo(options) {
        if (options === void 0) { options = {}; }
        this.protocolVersion = 5;
        this.sequence = 0;
        this.events = [];
        this.buffer = [];
        Object.assign(this, options);
    }
    return BinaryInfo;
}());
exports.BinaryInfo = BinaryInfo;
