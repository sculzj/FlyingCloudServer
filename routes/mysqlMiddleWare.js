/**
 * 引入mysql模块
 */
const mysql = require('mysql');
const MD5 = require("MD5");
const {Code, INFO} = require("./constants");
const {Status} = require("./constants");
const moment = require('moment');
const {nanoid} = require("nanoid");
const {resolve} = require("path");

/**
 * 引入自定义日志模块
 * @type {Logger}
 */
const logger = require('./log-component').logger;

/**
 * 声明存储数据库连接的Map
 * @type {Map<any, any>}
 */
const conMap = new Map();

/**
 *数据库配置参数
 * @type {{password: string, port: string, host: string, user: string}}
 */

const baseParams = {
    host: '192.168.101.3',
    port: '3306',
    user: 'root',
    password: '17xy8qzb',
    timezone: '+8:00'
};

const defaultConnection = mysql.createConnection(baseParams, (err) => {
    if (err) {
        console.log(err);
        logger.error(err);
    } else {
        logger.info('数据库登录成功！');
    }
});

defaultConnection.connect(err => {
    if (err) {
        console.log(err);
        logger.error('数据库连接失败！');
        return;
    }
    console.log('数据库连接成功！');
    const baseCon = mysql.createConnection({...baseParams, database: 'fly_cloud'});
    baseCon.connect(err2 => {
        if (err2) {
            logger.error('默认数据库连接失败！');
            return;
        }
        conMap.set('base', baseCon);
        console.log('默认数据库连接成功！');
        baseCon.query('select identity from companies where state=1', (err3, result3) => {
            if (err3) {
                console.log('默认数据库查询失败！');
                return;
            }
            //开始遍历所有企业信息，为企业建立数据库连接，并存放如conMap中
            if (result3.length > 0) {
                result3.forEach(item => {
                    const connection = mysql.createConnection({...baseParams, database: item.identity}, error => {
                        if (error) {
                            logger.error(`数据库${item.identity}连接失败！`);
                        }
                    });
                    connection.connect(error1 => {
                        if (error1) {
                            console.log(`数据库${item.identity}连接失败！`);
                            return;
                        }
                        conMap.set(item.identity, connection);
                        console.log(`数据库${item.identity}连接成功！`);
                    });
                });
            }
        });
    });
});

// const verifyUserSql = 'select * from users where userId=? and pwd=?';
const verifyOrgSql = 'select * from companies where email=? and pwd=?';
// const queryUserInfoSql = 'select * from userinfo where userId=?';
const queryProductInfoSql = 'select * from product_info';
const queryRank = 'select * from topic order by discuss DESC limit 10';
const queryOrgSql = 'select * from companies where code=?';
const verifyOrgEmailSql = 'select * from companies where email=?';
const searchOrgByEmail = 'select * from companies where email=?';

/**
 * 普通用户登录校验
 * @param uid 用户id
 * @param pwd 用户MD5加密密码
 * @param identity 企业标识
 */
function userToLogin(uid, pwd, identity) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接失败！');
        conMap.get(identity).query('select uid from users where uid =? and pwd=?', [uid, pwd], (err, result) => {
            if (err) {
                logger.error(err)
                reject("数据库操作错误！");
            } else {
                resolve(result);
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 管理员登录校验接口
 * @param uid 用户账号
 * @param pwd 登录密码
 * @param identity 企业标识
 * @returns {*} 验证结果
 */
function adminToLogin(uid, pwd, identity) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接失败！');
        conMap.get(identity).query('select uid from admins where uid =? and pwd=?', [uid, pwd], (err, result) => {
            if (err) {
                logger.error(err);
                reject('数据库查询失败！');
            } else {
                resolve(result);
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 执行异步操作，查询用户并返回验证结果
 * @param userInfo 用户信息：[userName,userPwd]，其中userPwd为MD5加密数据
 * @returns {Promise<unknown>}
 */
function verifyUser(userInfo) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, Status.error);
        defaultConnection.query(verifyUserSql, userInfo, (err, result) => {
            if (err) {
                logger.error(err);
                reject('数据库异常，查询用户失败！');
            }
            if (result.length === 1) {
                resolve(result);
            } else if (result.length === 0)
                reject('用户登录信息校验失败！');
        });
    });
}

function getUserInfo(userId) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, Status.error);
        defaultConnection.query(queryUserInfoSql, userId, (err, result) => {
            if (err)
                reject('查询用户信息失败！');
            if (result.length === 1) {
                resolve(result[0]);
            }
        })
    });
}

function getProductInfo() {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, Status.error);
        defaultConnection.query(queryProductInfoSql, [], (err, result) => {
            if (err)
                reject(Status.error);
            if (result.length >= 1) {
                resolve(result);
            }
        })
    });
}

function getRank() {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, Status.error);
        defaultConnection.query(queryRank, [], (err, result) => {
            if (err)
                reject(Status.error);
            if (result.length >= 1) {
                resolve(result);
            }
        });
    });
}

function verifyOrgCode(code) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, Status.error);
        conMap.get('base').query(queryOrgSql, [code], (err, result) => {
            if (err)
                reject(Status.error);
            if (result.length >= 1)
                resolve(result[0]);
            if (result.length === 0)
                resolve("");
        });
    });
}

function verifyOrgEmail(email) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, Status.error);
        conMap.get('base').query(verifyOrgEmailSql, [email], (err, result) => {
            if (err)
                reject(Status.error);
            if (result.length >= 1)
                resolve(result[0]);
            if (result.length === 0)
                resolve("");
        });
    });
}

function registerOrg(company) {
    const {code, name, email, address, site, mobile, telephone, identity} = company;
    const apply_time = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, Status.error);
        conMap.get('base').query(`insert into companies (code, name, email, address, site, mobile, telephone, identity,
                                                         apply_time)
                                  values (?, ?, ?, ?, ?, ?, ?, ?,
                                          ?)`, [code, name, email, address, site, mobile, telephone, identity, apply_time], (err) => {
            if (err) {
                console.log(err);
                reject("数据库异常，注册失败！");
            } else
                resolve("企业注册成功！");
        });
    })
}

//管理员账号登录校验
function verifyOrg(org) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, '数据库异常，查询失败！');
        defaultConnection.query(verifyOrgSql, org, (err, result) => {
            if (err)
                reject('数据库异常，查询用户失败！');
            if (result.length === 0)
                reject('用户登录信息校验失败！');
            if (result.length === 1)
                resolve(result[0]);
        });
    });
}

function verifyIdentity(identity) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, '数据库异常，查询失败！');
        conMap.get('base').query('select identity from companies where identity =?', [identity], (err, result) => {
            if (err) {
                reject('数据库异常，查询失败！');
            } else if (result.length > 0) {
                reject('识别码已存在，请重新输入！');
            } else {
                resolve('当前识别码可以使用！');
            }
        });
    });
}


function getOrgsInfo(identity) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, INFO.DATABASE_CONNECT_OVERTIME);
        conMap.get(identity).query('select * from organizations order by tier DESC,sequence ASC', (err, result) => {
            if (err) {
                reject(INFO.DATABASE_QUERY_ERR);
                logger.error(err);
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * 插入组织的数据库操作
 * @param identity
 * @param orgInfo
 * @returns {*}
 */
function insertOrgInfo(identity, orgInfo) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, INFO.DATABASE_CONNECT_OVERTIME);
        conMap.get(identity).query('insert into organizations values (?,?,?,?,?,?,?,?,?,?)', orgInfo, (err) => {
            if (err) {
                reject(INFO.DATABASE_QUERY_ERR);
            } else {
                resolve(INFO.DATABASE_QUERY_SUCCESS);
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 更新组织的操作
 * @param identity
 * @param data
 * @returns {*}
 */
function updateOrgsInfo(identity, data) {
    return new Promise(async (resolve, reject) => {
        const timer = setTimeout(reject, 15000, INFO.DATABASE_CONNECT_OVERTIME);
        const con = conMap.get(identity);
       if (data.length === 1 && !data[0].newCode) {
            con.query('update organizations set name = ?,garden=?,building=?,room=? where code =?', [data[0].name,
                data[0].garden, data[0].building, data[0].room, data[0].code], (err) => {
                if ('0:', err) {
                    console.log(err);
                    logger.error(err);
                    reject(INFO.DATABASE_QUERY_ERR);
                } else {
                    resolve(INFO.DATABASE_QUERY_SUCCESS);
                }
                clearTimeout(timer);
            });
        } else {
            for (let i = 0; i < data.length; i++) {
                try {
                    await con.query('update organizations set name=?,code=?,tier=?,parentCode=?,parentName=?,sequence=?,garden=?,building=?,room=? where code=?',
                        [data[i].name, data[i].newCode, data[i].tier, data[i].parentCode, data[i].parentName, data[i].sequence, data[i].garden, data[i].building,
                            data[i].room, data[i].code]);
                } catch (err) {
                    console.log('1:', err);
                    logger.error(err);
                    reject(INFO.DATABASE_QUERY_ERR);
                    clearTimeout(timer);
                    break;
                }
                if (i === data.length - 1) {
                    updateOrgsMembers(con).then(() => {
                        resolve(INFO.DATABASE_QUERY_SUCCESS);
                    }).catch().finally(() => {
                        clearTimeout(timer);
                    });
                }
            }
        }
    });
}

/**
 * 更新组织成员数量
 */
function updateOrgsMembers(connection) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, INFO.DATABASE_CONNECT_OVERTIME);
        connection.query('select sum(members) as totalmembers,parentCode from organizations group by parentCode', async (err, result) => {
            if (err) {
                console.log('2:', err);
                logger.error(err);
                reject(INFO.DATABASE_QUERY_ERR);
            } else if (result.length === 0) {
                resolve(INFO.DATABASE_QUERY_SUCCESS);
            } else {
                // console.log('成员分组：',result);
                for (let i = 0; i < result.length; i++) {
                    if (!result[i].parentCode) {
                        continue;
                    }
                    try {
                        await connection.query('update organizations set members=? where code=?', [result[i].totalmembers, result[i].parentCode]);
                    } catch (err) {
                        console.log('3:', err);
                        logger.error(err);
                        reject(INFO.DATABASE_QUERY_ERR);
                        clearTimeout(timer);
                        break;
                    }
                }
                resolve(INFO.DATABASE_QUERY_SUCCESS);
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 删除组织节点
 * @param identity 企业标识
 * @param code 节点代码
 * @returns {*}
 */
function deleteGroup(identity, code) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, INFO.DATABASE_CONNECT_OVERTIME);
        conMap.get(identity).query('delete from organizations where code=?', [code], (err) => {
                if (err)
                    reject(INFO.DATABASE_QUERY_ERR);
                else
                    resolve(INFO.DATABASE_QUERY_SUCCESS);
                clearTimeout(timer);
            }
        );
    });
}

/**
 * 删除节点后通过递归函数更新组织信息及关系
 * @param oldParent 要操作的组织机构父节点代码
 * @param newParent 要更新的组织结构父节点代码
 * @param rankIndex 标定删除节点的顺序值，只有被删除节点的兄弟节点需要更新顺序值
 * @param sql1 mySql查找执行语句
 * @param sql2 mySql更新执行语句
 * @param reject 期约兑换失败的方法
 */

async function recurseUpdateGroupInfo(oldParent, newParent, rankIndex, sql1, sql2, reject) {
    await defaultConnection.query(sql1, [oldParent], async (err, result) => {
        if (err)
            reject('数据库异常，查询失败！');
        if (result.length > 0) {
            for (let i = 0; i < result.length; i++) {
                let str = (i + 1).toString();
                switch (str.length) {
                    case 1:
                        str = '00' + str;
                        break;
                    case 2:
                        str = '0' + str;
                        break;
                    default:
                        break;
                }
                const newCode = newParent.concat(str);
                // console.log('标定顺序值：'+rankIndex);
                // console.log('原顺序值：'+result[i].rankIndex);
                const newIndex = result[i].rankIndex > rankIndex ? result[i].rankIndex - 1 : result[i].rankIndex;
                // console.log('新的顺序值：'+newIndex);
                await defaultConnection.query(sql2, [newCode, newParent, newIndex, result[i].groupCode], async (err1) => {
                    if (err1)
                        reject('数据库异常，操作失败！');
                    else {
                        await recurseUpdateGroupInfo(result[i].groupCode, newCode, 99, sql1, sql2, reject);
                    }
                });
            }
        }
    });
}

async function updateRankIndex(orgEmail, indexInfo) {
    let command = '';
    const inIndex = [];
    indexInfo.forEach(item => {
        command += `when ${item.groupCode} then ${item.rankIndex} `;
        inIndex.push(item.groupCode);
    });
    await defaultConnection.query(searchOrgByEmail, [orgEmail], async (err, result) => {
        if (err)
            console.log('数据库异常，查询失败！');
        if (result.length === 0)
            console.log('未查找到企业组织信息！');
        if (result.length === 1) {
            await defaultConnection.query(`update org_group_${result[0].orgCode.toLocaleLowerCase()}
                                           SET rankIndex=case groupCode ${command} end
                                           where groupCode in (${inIndex.join()})`, [], (err1) => {
                if (err1)
                    console.log('数据库异常，查询失败！');
            });
        }
    });
}

/**
 * 注册成功后调用的函数，根据企业信息创建数据库表，完成初始化
 * @param company 企业结构体
 * @returns {Promise<void>}
 */
function initCompanyResource(company) {
    return new Promise((resolve, reject) => {
        const {code, email, name, address, site, mobile, telephone, identity, register_time, license, letter} = company;
        //通过企业唯一标识创建企业数据库
        const createCompanyDateBase = `create database ${identity}`;
        //创建企业基础信息表
        const createCompanyInfo = `create table about
                                   (
                                       code          char(18) primary key comment '企业机构代码',
                                       name          varchar(32) not null comment '企业名称',
                                       email         varchar(32) not null comment '企业管理邮箱',
                                       site          varchar(32) not null comment '企业站点',
                                       address       varchar(64) not null comment '企业地址',
                                       mobile        char(11)    not null comment '企业联系电话',
                                       telephone     char(12)    not null comment '企业联系固话',
                                       fax           varchar(12) comment '企业传真',
                                       logo          varchar(64) comment '企业logo',
                                       identity      varchar(8)  not null comment '企业标识',
                                       members       int(7)   default 0 comment '成员数量',
                                       register_time datetime comment '注册时间',
                                       license       varchar(64) not null comment '营业执照',
                                       letter        varchar(64) not null comment '授权函',
                                       source        float(2) default 0 comment '套餐使用'
                                   )`;
        //创建企业组织表
        const createOrganizations = `create table organizations
                                     (
                                         code       varchar(30) primary key comment '部门代码',
                                         name       varchar(32) comment '部门名称',
                                         members    int(7) default 0 comment '成员数量',
                                         tier       int(1) comment '部门层级',
                                         parentCode varchar(27) comment '父节点代码',
                                         parentName varchar(32) comment '父节点名称',
                                         sequence   int(2) comment '部门排序',
                                         garden     varchar(16) comment '所在园区',
                                         building   varchar(16) comment '所在楼栋',
                                         room       varchar(16) comment '办公楼层'
                                     )`;
        //创建企业用户表
        const createUsers = `create table users
                             (
                                 uid          varchar(32) not null primary key comment '用户id',
                                 pwd          varchar(32) not null comment '用户密码',
                                 name         varchar(16) not null comment '用户名称',
                                 email        varchar(32) not null comment '邮箱',
                                 phone        int(11) comment '移动电话',
                                 shortPhone   int(6) comment '短号',
                                 nick         varchar(16) comment '昵称',
                                 sex          char(1)     not null comment '性别',
                                 companyCode  char(18)    not null comment '企业代码',
                                 companyName  varchar(32) not null comment '企业名称',
                                 department   varchar(32) not null comment '归属部门名称',
                                 orgCode      varchar(30) not null comment '归属部门代码',
                                 orgRole      int(4)      not null comment '角色，0~10为部门负责人，11及以后表示普通员工，部门人员排序依据',
                                 post         varchar(16) comment '职务',
                                 title        varchar(16) comment '头衔称号',
                                 init         int(1)               default 0 comment '初始化状态，0-未初始化，1-初始化',
                                 question1    varchar(64) comment '密保问题',
                                 answer1      varchar(64) comment '密保答案',
                                 question2    varchar(64) comment '密保问题',
                                 answer2      varchar(64) comment '密保答案',
                                 question3    varchar(64) comment '密保问题',
                                 answer3      varchar(64) comment '密保答案',
                                 state        int(1)      not null default 1 comment '账号状态，1-正常，0-冻结，-1-注销',
                                 status       int(1)      not null default 0 comment '个人状态，1-正常，2-忙碌，3-空闲，4-崩溃，5-出差，6-休假',
                                 mood         varchar(64) comment '个人心情',
                                 backlog      int(2)               default 0 comment '待办事项',
                                 logo         varchar(64) comment '企业logo路径',
                                 icon         varchar(64) comment '个人头像路径',
                                 onlineByDesk int(1)      not null default -1 comment 'PC在线状态，-1-离线，1-在线',
                                 onlineByApp  int(1)      not null default -1 comment 'APP在线状态，-1-离线，1-在线'
                             )`;
        //创建密保问题表
        const createSecurityQuestions = `create table security_questions
                                         (
                                             question varchar(64) primary key not null comment '密保问题'
                                         )`;
        //创建企业管理员表
        const createAdmins = `create table admins
                              (
                                  uid          varchar(32) primary key not null comment '管理员账号',
                                  pwd          char(32)                not null comment '登录密码',
                                  name         varchar(16)             not null comment '姓名',
                                  mobile       char(11)                not null comment '移动电话',
                                  init         int(1)                  not null default 0 comment '初始化状态，0-未初始化，1-初始化',
                                  state        int(1)                  not null default 1 comment '账号状态，1-有效，-1-无效/冻结',
                                  question1    varchar(64) comment '密保问题',
                                  answer1      varchar(64) comment '密保答案',
                                  question2    varchar(64) comment '密保问题',
                                  answer2      varchar(64) comment '密保答案',
                                  question3    varchar(64) comment '密保问题',
                                  answer3      varchar(64) comment '密保答案',
                                  userControl  int(1) comment '用户控制权限，1-有权限，-1-无权限',
                                  source       int(1) comment '资源控制权限，1-有权限，-1-无权限',
                                  other        int(1) comment '预留权限',
                                  onlineByDesk int(1)                  not null default -1 comment 'PC在线状态，-1-离线，1-在线',
                                  onlineByApp  int(1)                  not null default -1 comment 'APP在线状态，-1-离线，1-在线',
                                  root         int(1)                  not null default -1 comment '是否根用户'
                              )`;
        defaultConnection.query(createCompanyDateBase, (err) => {
            if (err) {
                console.log('企业资源初始化失败，请联系管理员！', err);
                reject('企业资源初始化失败，请联系管理员！');
            } else {
                console.log(`创建数据库${identity}成功！`);
                const theCon = mysql.createConnection({...baseParams, database: identity});
                console.log('开始创建表...');
                theCon.connect(err2 => {
                    if (err2) {
                        console.log('企业数据库连接失败，请联系管理员！', err2);
                        reject('企业资源初始化失败，请联系管理员！');
                    } else {
                        conMap.set(identity, theCon);
                        theCon.query(createCompanyInfo, err0 => {
                            if (err0) {
                                console.log('企业基础信息表创建失败！', err0);
                                reject('企业资源初始化失败，请联系管理员！');
                            } else {
                                // noinspection SqlResolve
                                theCon.query('insert into about (code,name,email,site,address,mobile,telephone,identity,register_time,license,letter) values (?,?,?,?,?,?,?,?,?,?,?)', [
                                    code, name, email, site, address, mobile, telephone, identity, moment(register_time).format('YYYY-MM-DD HH:mm:ss'), license, letter
                                ], err_1 => {
                                    if (err_1) {
                                        console.log('企业基础信息初始化失败！', err_1);
                                        reject('企业资源初始化失败，请联系管理员！');
                                    } else {
                                        theCon.query(createOrganizations, err3 => {
                                            if (err3) {
                                                console.log('企业组织表创建失败，请联系管理员！', err3);
                                                reject('企业资源初始化失败，请联系管理员！');
                                            } else {
                                                // noinspection SqlResolve
                                                theCon.query('insert into organizations values (?,?,?,?,?,?,?)', ['001', '根节点', 0, 1, '', '', 1], err4 => {
                                                    if (err4) {
                                                        console.log('企业组织表初始化失败，请联系管理员！', err4);
                                                        reject('企业资源初始化失败，请联系管理员！');
                                                    } else {
                                                        console.log(`创建组织表organizations成功！`);
                                                        theCon.query(createUsers, err5 => {
                                                            if (err5) {
                                                                console.log('企业用户表创建失败，请联系管理员！', err5);
                                                                reject('企业资源初始化失败，请联系管理员！');
                                                            } else {
                                                                console.log('创建用户表users成功！');
                                                                theCon.query(createAdmins, err6 => {
                                                                    if (err6) {
                                                                        console.log('创建企业管理员表失败，请联系管理员！', err6);
                                                                        reject('企业资源初始化失败，请联系管理员！');
                                                                    } else {
                                                                        const pwd = nanoid(8);
                                                                        // noinspection SqlResolve
                                                                        theCon.query('insert into admins (uid,pwd,name,mobile,userControl,source,other,root) values (?,?,?,?,?,?,?,?)', [
                                                                            email, MD5(pwd), name, mobile, 1, 1, 1, 1
                                                                        ], err7 => {
                                                                            if (err7) {
                                                                                console.log('初始化企业管理员信息失败！', err7);
                                                                                reject('企业资源初始化失败，请联系管理员！');
                                                                            } else {
                                                                                theCon.query(createSecurityQuestions, err8 => {
                                                                                    if (err8) {
                                                                                        console.log('创建密保问题表失败！', err8);
                                                                                        reject('企业资源初始化失败，请联系管理员！');
                                                                                    } else {
                                                                                        // noinspection SqlResolve
                                                                                        theCon.query('insert into security_questions (question) values (?),(?),(?),(?),(?),(?),(?),(?),(?)', [
                                                                                            '您最喜欢的小学老师是哪一位？', '您最喜欢的体育运动是哪一项？', '您最崇拜的科学家是哪一位？', '您小时候的绰号是什么？', '您去过的第一个省外城市是哪一个？',
                                                                                            '您生活得最久或最喜欢的地方叫什么？', '您最好的朋友的名字是什么？', '您第一只宠物的名称是什么？', '您记忆最深刻的日期是那一天？'
                                                                                        ], err9 => {
                                                                                            if (err9) {
                                                                                                console.log('密保问题初始化失败！', err9);
                                                                                                reject('企业资源初始化失败，请联系管理员！');
                                                                                            } else {
                                                                                                resolve(pwd);
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        })
                    }
                });
            }
        });
    })
}

/**
 * 系统管理员用户登录验证
 * @param uid
 * @param pwd
 * @returns {Promise<void>}
 */
function verifySysUser(uid, pwd) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject('数据库连接超时！')
        }, 15000);
        conMap.get('base').query('select * from sys_users where uid=? and pwd=?', [uid, pwd], (err, result) => {
            clearTimeout(timer);
            if (err) {
                reject('数据库查询失败！');
            } else {
                resolve(result);
            }
        });
    });
}

function getQuestions() {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject('数据库连接超时！')
        }, 15000);
        conMap.get('base').query('select question from security_questions', (err, result) => {
            clearTimeout(timer);
            if (err) {
                reject('数据库查询失败！');
            } else {
                resolve(result);
            }
        });
    });
}

function initSysPwd(data) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接超时！');
        conMap.get('base').query('update sys_users set pwd=?,question1=?,answer1=?,question2=?,answer2=?,question3=?,answer3=?,init=? where uid=?', data, (err) => {
            if (err) {
                reject('数据库更新失败！');
            } else {
                clearTimeout(timer);
                resolve('密码更新成功！');
            }
        });
    });
}

function getApplyOrgs() {
    return new Promise((resolve, reject) => {
        const timerId = setTimeout(reject, 15000, '数据库查询失败！');
        conMap.get('base').query('select name,identity,apply_time from companies where state= ?', [0], (err, result) => {
            if (err) {
                reject('数据库查询失败！');
            } else {
                resolve(result);
            }
            clearTimeout(timerId);
        });
    });
}

function uploadApplyFile(data) {
    return new Promise((resolve, reject) => {
        const timerId = setTimeout(reject, 15000, '数据库更新失败！');
        conMap.get('base').query('update companies set license=?,letter=? where identity=?', [data.license, data.letter, data.identity], (err) => {
            if (err) {
                reject('文件上传失败！');
            } else {
                resolve('文件上传成功！');
            }
            clearTimeout(timerId);
        });
    });
}

function getApplyInfo(identity) {
    return new Promise((resolve, reject) => {
        const timerId = setTimeout(reject, 15000, '数据库更新失败！');
        conMap.get('base').query('select code,name,site,address,identity,apply_time,license,letter from companies where identity=?', [identity], (err, result) => {
            if (err || result.length === 0) {
                reject('数据库查询失败！');
            } else {
                resolve(result);
            }
            clearTimeout(timerId);
        });
    });
}

/**
 * 根据企业审核结果，更新企业信息
 * @param identity 企业唯一标识码
 * @param approve 审核结果，boolean值，true为通过，false为拒绝
 */
function approveOrg(identity, approve) {
    return new Promise((resolve, reject) => {
        const timerId = setTimeout(reject, 15000, '企业信息更新失败！');
        const con = conMap.get('base');
        con.query('update companies set state=?,register_time=? where identity=?', [approve ? 1 : -1, moment(new Date()).format('YYYY-MM-DD HH:mm:ss'), identity], err => {
            if (err) {
                // console.log(err);
                reject('企业信息更新失败！');
                clearTimeout(timerId);
            } else {
                con.query('select * from companies where identity=?', [identity], (err1, result) => {
                    if (err1) {
                        reject('企业信息查询失败！');
                    } else {
                        resolve(result[0]);
                    }
                    clearTimeout(timerId);
                });
            }
        });
    });
}

/**
 * 查找系统用户id
 * @param uid
 */
function verifySysUid(uid) {
    return new Promise((resolve, reject) => {
        const timerId = setTimeout(reject, 15000, '数据库链接失败！');
        conMap.get('base').query('select uid from sys_users where uid=?', [uid], (err, result) => {
            if (err) {
                reject('数据库查询出错！');
            } else {
                resolve(result);
            }
            clearTimeout(timerId);
        });
    });
}

function addSysUser(userinfo) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库操作失败！');
        conMap.get('base').query('insert into sys_users (uid, pwd, start,end,view,approve,userControl,push,app,other,mobile) values (?,?,?,?,?,?,?,?,?,?,?)',
            [userinfo.uid, userinfo.pwd, userinfo.start, userinfo.end, userinfo.view, userinfo.approve, userinfo.userControl, userinfo.push, userinfo.app, userinfo.other, userinfo.mobile], err => {
                if (err) {
                    console.log(err);
                    reject('账号创建失败！');
                } else {
                    resolve('账号创建成功！')
                }
                clearTimeout(timer);
            });
    });
}

function getAuthList() {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库操作失败');
        conMap.get('base').query('select uid,state,start,end,view,approve,userControl,push,app,other,mobile from sys_users where root=?', [-1], (err, result) => {
            if (err) {
                reject('数据库操作失败！');
                clearTimeout(timer);
            } else {
                resolve(result);
                clearTimeout(timer);
            }
        });
    });
}

/**
 * 删除系统用户
 * @param uid 用户id
 * @returns {*}
 */
function deleteSysUser(uid) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接超时！');
        conMap.get('base').query('delete from sys_users where uid=?', [uid], (err) => {
            if (err) {
                logger.error('数据库错误：', err);
                reject('数据库操作失败！');
            } else {
                resolve('账户删除成功！');
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 改变系统用户状态
 * @param uid 用户id
 * @param state 用户状态：1-有效，0-有效期超期,-1-冻结
 * @returns {*}
 */
function changeSysUserState(uid, state) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接超时！');
        conMap.get('base').query('update sys_users set state=? where uid=?', [state, uid], err => {
            if (err) {
                logger.error('数据库错误：', err);
                reject('数据库操作失败！');
            } else {
                resolve('账户状态更新成功！');
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 更新系统用户账户信息
 * @param state 状态
 * @param view 数据看板权限
 * @param approve 企业审批权限
 * @param userControl 用户管理权限
 * @param push 消息推送权限
 * @param app 移动登录权限
 * @param other 预留权限
 * @param end 结束有效期
 * @param uid 用户id
 * @returns {*}
 */
function updateSysUser(state, view, approve, userControl, push, app, other, end, uid) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接超时！');
        conMap.get('base').query('update sys_users set state=?,view=?,approve=?,userControl=?,push=?,app=?,other=?,end=? where uid=?', [state, view, approve, userControl, push, app, other, end, uid], err => {
            if (err) {
                logger.error('数据库错误：', err);
                reject('数据库操作失败！');
            } else {
                resolve('账户信息更新成功！');
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 获取企业列表的异步方法
 */
function getCompaniesList() {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接超时！');
        conMap.get('base').query('select identity,name,register_time,site,address,mobile,email,state,members,source from companies where state!=0', (err, result) => {
            if (err) {
                console.log(err);
                reject('数据库操作失败！');
            } else {
                resolve(result);
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 导出企业数据
 * @param keys identity关键字，数组
 */
function exportCompaniesInfo(keys) {
    let sql = '';
    if (keys.length === 0) {
        sql = 'select code,name,site,address,email,mobile,telephone,source,fax,identity,members,state,register_time from companies where state<>0';
    } else {
        let str = '';
        keys.forEach(item => {
            str += '\'' + item + '\',';
        });
        str = str.slice(0, -1);
        // console.log(str);
        sql = `select code,
                      name,
                      site,
                      address,
                      email,
                      mobile,
                      telephone,
                      source,
                      fax,
                      identity,
                      members,
                      state,
                      register_time
               from companies
               where state <> 0
                 and identity in (${str})`;
    }
    return new Promise((resolve, reject) => {
        conMap.get('base').query(sql, (err, result) => {
            const timer = setTimeout(reject, 15000, '数据库连接超时！');
            if (err) {
                reject('数据库查询失败！');
            } else {
                resolve(result);
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 查询消息模板目录
 * @param uid 用户id
 */
function getTemplateList(uid) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接超时！');
        const sql = 'select templates from template_relation where uid=?';
        conMap.get('base').query(sql, [uid], (err, result) => {
            if (err) {
                logger.error('消息模板目录查询失败！');
            } else {
                resolve(result);
            }
            clearTimeout(timer);
        });
    });
}

/**
 * 更新消息模板目录
 * @param uid 用户id
 * @param templates 目录字符串
 */
function updateTemplateList(uid, templates) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(reject, 15000, '数据库连接超时！');
        const sql = 'update template_relation set templates = ? where uid =?';
        conMap.get('base').query(sql, [templates, uid], (err) => {
            if (err) {
                logger.error(`${uid}消息模板目录更新失败！`);
            } else {
                resolve('消息模板更新成功！');
            }
            clearTimeout(timer);
        });
    });
}

module.exports = {
    userToLogin,
    adminToLogin,
    verifyUser,
    getUserInfo,
    getProductInfo,
    getRank,
    verifyOrgCode,
    registerOrg,
    verifyOrgEmail,
    verifyOrg,
    getOrgsInfo,
    insertOrgInfo,
    deleteGroup,
    updateRankIndex,
    initCompanyResource,
    verifyIdentity,
    verifySysUser,
    getQuestions,
    initSysPwd,
    getApplyOrgs,
    uploadApplyFile,
    getApplyInfo,
    approveOrg,
    verifySysUid,
    addSysUser,
    getAuthList,
    deleteSysUser,
    changeSysUserState,
    updateSysUser,
    getCompaniesList,
    exportCompaniesInfo,
    getTemplateList,
    updateTemplateList,
    updateOrgsInfo
};