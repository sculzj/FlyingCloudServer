const mysql = require("mysql");
const params = {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '17xy8qzb',
    database:'fly_cloud'
};
mysql.createConnection(params, (err) => {
    if (err) {
        console.log('数据库连接失败！')
    } else {
        console.log('数据库连接成功！');
    }
});