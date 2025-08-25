"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSgDate = void 0;
const getSgDate = () => {
    const date = new Date();
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const sgOffset = 8;
    return new Date(utc + sgOffset * 60 * 60000);
};
exports.getSgDate = getSgDate;
