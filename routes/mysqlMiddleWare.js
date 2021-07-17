/**
 * 引入mysql模块
 */
const mysql = require('mysql');
const MD5 = require("MD5");
const {Code} = require("./constants");
const {Status} = require("./constants");
const moment = require('moment');

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
    host: '192.168.101.4',
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
    const baseCon = mysql.createConnection({...baseParams, database: 'fly_cloud'}, err1 => {
        if (err1) {
            logger.error('默认数据库连接失败！');
        }
    });
    baseCon.connect(err2 => {
        if (err2) {
            logger.error('默认数据库连接失败！');
            return;
        }
        conMap.set('base', baseCon);
        console.log('默认数据库连接成功！');
        baseCon.query('select identity from orgs where state=1', (err3, result3) => {
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
const verifyOrgSql = 'select * from orgs where email=? and pwd=?';
// const queryUserInfoSql = 'select * from userinfo where userId=?';
const queryProductInfoSql = 'select * from product_info';
const queryRank = 'select * from topic order by discuss DESC limit 10';
const queryOrgSql = 'select * from orgs where code=?';
const createOrgSql = 'insert into orgs SET ?';
const verifyOrgEmailSql = 'select * from orgs where email=?';
const searchOrgByEmail = 'select * from orgs where email=?';


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

function registerOrg(org) {
    org.pwd = MD5(org.pwd);
    org.apply_time = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, Status.error);
        conMap.get('base').query(createOrgSql, [org], (err) => {
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
        conMap.get('base').query('select identity from orgs where identity =?', [identity], (err, result) => {
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


function getOrganizations(orgEmail) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, '数据库异常，查询失败！');
        defaultConnection.query(searchOrgByEmail, [orgEmail], (err, result) => {
            if (err)
                reject('数据库异常，查询用户失败！');
            if (result.length === 0)
                reject('用户登录信息校验失败！');
            if (result.length === 1) {
                conMap.get(result[0].identity).query(`select *
                                                      from organizations
                                                      order by tier DESC, sequence ASC`, [], (err, result2) => {
                    if (err)
                        reject('数据库异常，查询失败！');
                    if (result2.length === 0)
                        reject('该企业组织为空！');
                    resolve(result2);
                });
            }

        });
    });
}

function updateOrgGroup(orgEmail, group) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, '数据库异常，查询失败！');
        defaultConnection.query(searchOrgByEmail, [orgEmail], (err, result) => {
            if (err)
                reject('数据库异常，查询用户失败！');
            if (result.length === 0)
                reject('未查找到企业组织信息，请联系系统管理员！');
            if (result.length === 1) {
                const con = conMap.get(result[0].identity);
                const {groupName, parent, groupCode, groupMembers, groupLevel, originalCode} = group;
                //如果提交的组织节点代码和原组织节点代码一致，则只修改组织名称
                if (groupCode === originalCode) {
                    con.query(`update organizations
                               SET name = ?
                               WHERE code = ?`, [groupName, originalCode], (err1) => {
                        if (err1)
                            reject('组织信息更新失败！');
                        resolve('组织信息修改成功！');
                    });
                } else {
                    //先将要修改的节点复制到新的父节点下
                    const rankIndex = Number.parseInt(groupCode.slice(-3));
                    // console.log('1:'+rankIndex);
                    // console.log('2:'+groupCode);
                    con.query(`insert into organizations
                               SET ?`, {
                        groupCode,
                        groupName,
                        parent,
                        groupMembers,
                        groupLevel,
                        rankIndex
                    }, err2 => {
                        if (err2)
                            reject('组织信息更新失败！');
                        //复制成功后，遍历更新其子节点到新节点下
                        const searchSql = `select *
                                           from organizations
                                           where parentCode = ?
                                           order by sequence ASC`;
                        const updateSql = `update organizations
                                           SET code=?,
                                               parentCode=?,
                                               tier=?
                                           where code = ?`;
                        updateGroupCode(searchSql, updateSql, originalCode, groupCode, reject).then(() => {
                            // console.log('开始执行删除操作...');
                            //先查找顺序标定值
                            defaultConnection.query(`select rankIndex
                                                     from org_group_${result[0].orgCode.toLocaleLowerCase()}
                                                     where groupCode = ?`, [originalCode], (err3, result3) => {
                                if (err3)
                                    reject('数据库异常，查询失败！');
                                const rankIndex = result3[0].rankIndex;
                                defaultConnection.query(`delete
                                                         from org_group_${result[0].orgCode.toLocaleLowerCase()}
                                                         where groupCode = ?`, [originalCode], (err4) => {
                                    if (err4)
                                        reject('组织删除失败！');
                                    // console.log('删除操作完毕，开始更新兄弟节点信息...');
                                    const searchNode = `select *
                                                        from org_group_${result[0].orgCode.toLocaleLowerCase()}
                                                        where parent = ?
                                                        order by groupCode ASC`;
                                    const updateNode = `update org_group_${result[0].orgCode.toLocaleLowerCase()}
                                                        SET groupCode=?,
                                                            parent=?,
                                                            rankIndex=?
                                                        WHERE groupCode = ?`;
                                    recurseUpdateGroupInfo(originalCode.slice(0, originalCode.length - 3), originalCode.slice(0, originalCode.length - 3), rankIndex, searchNode, updateNode, reject).then(() => {
                                        resolve(Code.success);
                                    });
                                });
                            });
                        });
                        //删除原节点，并遍历更新相关的节点信息
                    });
                }
            }

        });
    });
}

function insertGroupInfo(orgEmail, group) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, '数据库连接超时！');
        defaultConnection.query(searchOrgByEmail, [orgEmail], (err, result) => {
            if (err)
                reject('数据库异常，查询失败！');
            if (result.length === 0)
                reject('未查找到企业组织信息！');
            if (result.length === 1) {
                defaultConnection.query(`insert into org_group_${result[0].orgCode.toLocaleLowerCase()}
                                         SET ?`, group, (err) => {
                    if (err)
                        reject('添加组织失败！');
                    resolve('组织添加成功！');
                });
            }
        });
    });
}

function deleteGroup(orgEmail, groupCode) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 15000, '数据库连接超时！');
        defaultConnection.query(searchOrgByEmail, [orgEmail], (err, result) => {
                if (err)
                    reject('数据库异常，查询失败！');
                if (result.length === 0)
                    reject('未查找到企业组织信息！');
                if (result.length === 1) {
                    defaultConnection.query(`select rankIndex
                                             from org_group_${result[0].orgCode.toLocaleLowerCase()}
                                             where groupCode = ?`, [groupCode], (err1, result1) => {
                        if (err1)
                            reject('数据库异常，查询失败！');
                        const rankIndex = result1[0].rankIndex;
                        defaultConnection.query(`delete
                                                 from org_group_${result[0].orgCode.toLocaleLowerCase()}
                                                 where groupCode = ?`, [groupCode], (err2) => {
                            if (err2)
                                reject('组织删除失败！');
                            const searchNode = `select *
                                                from org_group_${result[0].orgCode.toLocaleLowerCase()}
                                                where parent = ?
                                                order by groupCode ASC`;
                            const updateNode = `update org_group_${result[0].orgCode.toLocaleLowerCase()}
                                                SET groupCode=?,
                                                    parent=?,
                                                    rankIndex=?
                                                WHERE groupCode = ?`;
                            recurseUpdateGroupInfo(groupCode.slice(0, groupCode.length - 3), groupCode.slice(0, groupCode.length - 3), rankIndex, searchNode, updateNode, reject).then(() => {
                                resolve(Code.success)
                            });
                        });
                    });
                }
            }
        );
    });
}

async function updateGroupCode(sql1, sql2, oldParent, newParent, reject) {
    await defaultConnection.query(sql1, [oldParent], async (err, result) => {
        // console.log(`查询到${oldParent}的子节点有${result.length}个！`);
        if (err)
            reject('数据库异常，查询失败！');
        if (result.length > 0) {
            for (let i = 0; i < result.length; i++) {
                // console.log(`开始更新节点${result[i].groupCode}信息！`);
                const newCode = newParent.concat(result[i].groupCode.slice(-3));
                await defaultConnection.query(sql2, [newCode, newParent, newParent.length / 3 + 1, result[i].groupCode], async err1 => {
                    if (err1)
                        reject('数据库异常，查询失败！');
                    // console.log(`更新后的节点代码${newParent.concat(result[i].groupCode.slice(-3))}`);
                    await updateGroupCode(sql1, sql2, result[i].groupCode, newParent.concat(result[i].groupCode.slice(-3)), reject);
                });
            }
        }
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
 * 注册成功后调用的函数，根据组织机构代码创建数据库表，完成初始化
 * @param orgCode
 * @returns {Promise<void>}
 */
async function initOrgResource(identity) {
    const createOrgDateBase = `create database ${identity}`;
    const createOrganizations = `create table organizations
                                 (
                                     code       varchar(30) primary key comment '部门代码',
                                     name       varchar(32) comment '部门名称',
                                     members    int default 0 comment '成员数量',
                                     tier       int comment '部门层级',
                                     parentCode varchar(27) comment '父节点代码',
                                     parentName varchar(32) comment '父节点名称',
                                     sequence   int comment '部门排序'
                                 )`;
    const createOrgUsers = `create table users
                            (
                                uid          varchar(32) primary key comment '用户id',
                                pwd          varchar(32) comment '用户密码',
                                name         varchar(16) comment '用户名称',
                                email        varchar(32) comment '邮箱',
                                phone        int(11) comment '移动电话',
                                shortPhone   int(6) comment '短号',
                                nick         varchar(16) comment '昵称',
                                orgCode      varchar(30) comment '归属企业代码',
                                orgName      varchar(32) comment '归属企业名称',
                                department   varchar(32) comment '归属部门名称',
                                groupCode    varchar(30) comment '归属部门代码',
                                role         int comment '角色，0~10为部门负责人，11及以后表示普通员工，部门人员排序依据',
                                post         varchar(16) comment '职务',
                                title        varchar(16) comment '头衔称号',
                                state        int default 1 comment '账号状态，1-正常，0-冻结，-1-注销',
                                status       int default 0 comment '个人状态，1-正常，2-忙碌，3-空闲，4-崩溃，5-出差，6-休假',
                                mood         varchar(64) comment '个人心情',
                                backlog      int default 0 comment '待办事项',
                                logo         varchar(64) comment '企业logo',
                                icon         varchar(64) comment '个人头像',
                                onlineByDesk int default -1 comment 'PC在线状态，-1-离线，1-在线',
                                onlineByApp  int default -1 comment 'APP在线状态，-1-离线，1-在线'
                            )`;
    await defaultConnection.query(createOrgDateBase, (err) => {
        if (err)
            throw new Error('企业资源初始化失败，请联系管理员！');
        else
            console.log(`创建数据库${identity}成功！`);
    });
    const theCon = mysql.createConnection({...baseParams, database: identity}, err1 => {
        if (err1)
            throw new Error('企业资源初始化失败，请联系管理员！');
    });
    await theCon.connect(err2 => {
        if (err2)
            throw new Error('企业资源初始化失败，请联系管理员！');
        else
            conMap.set(identity, theCon);
    });
    await theCon.query(createOrganizations, err3 => {
        if (err3)
            throw new Error('企业资源初始化失败，请联系管理员！');
        else {
            theCon.query('insert into organizations values (?,?,?,?,?,?,?)', ['001', '根节点', 0, 1, '', '', 1], err4 => {
                if (err4)
                    throw new Error('企业资源初始化失败，请联系管理员！');
                else
                    console.log(`创建组织表organizations成功！`);
            });
        }
    });
    await theCon.query(createOrgUsers, err5 => {
        if (err5)
            throw new Error('企业资源初始化失败，请联系管理员！');
        else console.log('创建用户表users成功！')
    });
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
        conMap.get('base').query('select name,identity,apply_time from orgs where state= ?', [0], (err, result) => {
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
        conMap.get('base').query('update orgs set license=?,letter=? where identity=?', [data.license, data.letter, data.identity], (err) => {
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
        conMap.get('base').query('select code,name,site,address,identity,apply_time,license,letter from orgs where identity=?', [identity], (err, result) => {
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
        con.query('update orgs set state=?,register_time=? where identity=?', [approve ? 1 : -1, moment(new Date()).format('YYYY-MM-DD HH:mm:ss'), identity], err => {
            if (err) {
                // console.log(err);
                reject('企业信息更新失败！');
                clearTimeout(timerId);
            } else {
                con.query('select email from orgs where identity=?', [identity], (err1, result) => {
                    if (err1) {
                        reject('企业邮箱查询失败！');
                    } else {
                        resolve(result[0].email);
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
            [userinfo.uid, userinfo.pwd, userinfo.start, userinfo.end, userinfo.view, userinfo.approve, userinfo.userControl, userinfo.push, userinfo.app, userinfo.other,userinfo.mobile], err => {
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

function getAuthList(){
    return new Promise((resolve,reject)=>{
        const timer=setTimeout(reject,15000,'数据库操作失败');
        conMap.get('base').query('select uid,state,start,end,view,approve,userControl,push,app,other,mobile from sys_users where root=?',[-1],(err,result)=>{
            if (err){
                reject('数据库操作失败！');
                clearTimeout(timer);
            }else {
                resolve(result);
                clearTimeout(timer);
            }
        });
    });
}

module.exports = {
    verifyUser,
    getUserInfo,
    getProductInfo,
    getRank,
    verifyOrgCode,
    registerOrg,
    verifyOrgEmail,
    verifyOrg,
    getOrganizations,
    updateOrgGroup,
    insertGroupInfo,
    deleteGroup,
    updateRankIndex,
    initOrgResource,
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
    getAuthList
};