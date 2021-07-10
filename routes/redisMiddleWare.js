const redis = require('redis');
const md5 = require('MD5');

const {Status} = require("./constants");


const client = redis.createClient(6379, "127.0.0.1");
client.auth("17xy8qzb");

/**
 * 验证用户登录信息
 * @param userId
 * @param pwd
 * @returns {Promise<number>}
 */
function verifyUserLogin(userId, pwd) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000);
        client.hget(userId, "pwd", (err, result) => {
            if (err) {
                reject(err.message);
            } else if (md5(pwd) === result) {
                resolve(Status.success);
            } else
                resolve(Status.refused);
        });
    });
}

function getProductInfo(){
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000);
        client.hgetall("producInfo",  (err, result) => {
            if (err) {
                reject(err.message);
            } else
                return;
                // resolve(result.info);
        });
    });
}

exports.verifyUserLogin = verifyUserLogin;
exports.getProductInfo=getProductInfo;