const Status = {
    waiting: "waiting",
    ready: "ready",
    success: "success",
    failed: "failed",
    refused: "refused",
    error: "error",
    overtime: "overtime"
};
const Code = {success: 200, error: 500, refused: 401, overtime: 408, failed: -200,ready:199};
const serverIP = 'http://127.0.0.1:7080'
const INFO = {
    DATABASE_CONNECT_OVERTIME: '数据库连接超时！',
    DATABASE_QUERY_ERR: '数据库操作失败！',
    DATABASE_QUERY_SUCCESS:'数据库操作成功！',
    TOKEN_DATE_OUT: 'token已过期，请重新登录！',
    SYSTEM_ERR: '系统错误，请联系管理员处理！',
    DATABASE_QUERY_EMPTY:'数据库查询结果为空！'
}

exports.Status = Status;
exports.Code = Code;
exports.serverIP = serverIP;
exports.INFO = INFO;