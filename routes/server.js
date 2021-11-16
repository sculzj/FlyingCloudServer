/**
 * 引入三方模块
 */
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const MD5 = require('MD5');
const formidable = require('formidable');
const Excel = require('exceljs');
const {emailTo} = require("./mailServer");
const moment = require('moment');

/**
 * 引入自定义模块
 */
const logger = require('./log-component').logger;
const privateKey = fs.readFileSync('../key/private.key');
const {Status, Code, serverIP, INFO} = require('./constants');
const {
    getRank,
    getUserInfo,
    registerOrg,
    deleteOrg,
    initCompanyResource,
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
    updateTemplateList, userToLogin, adminToLogin, getOrgsInfo, insertOrgInfo, updateOrgsInfo, getPayingProductInfo,
    getShoppingProduct, getJobNum, getUid, getUserName, getCommonPermission, createRole, getRolesInfo, updateRoleInfo,
    deleteRoleInfo, getCandidateUsers, createUser
} = require('./mysqlMiddleWare');
// const {verifyUserLogin,getProductInfo} = require('./redisMiddleWare');

const app = express();

//定义登录二维码Map
const QRCodeMap = new Map();

app.use(express.static('../public'));
app.listen('7080', () => {
    logger.info('服务器已启动......')
});

/**
 * 用户登录接口
 */
app.post('/login', bodyParser.json(), (req, res) => {
    const {uid, pwd, identity, admin} = req.body
    // console.log(req.body);
    if (admin) {
        adminToLogin(uid, pwd, identity).then(result => {
            sendLoginResultToClient(result, identity, res);
        }).catch(err => {
            logger.error(err);
            res.status(Code.error).send({code: Code.error, msg: '系统错误，请联系管理员处理！'});
        });
    } else {
        userToLogin(uid, pwd, identity).then(result => {
            sendLoginResultToClient(result, identity, res);
        }).catch(err => {
            logger.error(err);
            res.status(Code.error).send({code: Code.error, msg: '系统错误，请联系管理员处理！'});
        })
    }

})

/**
 * 根据数据库查询结果，向客户端返回登录结果
 * @param result 数据库查询结果
 * @param identity 账号绑定的企业标识
 * @param res http的response连接
 */
function sendLoginResultToClient(result, identity, res) {
    if (result.length === 1) {
        jwt.sign({
            algorithm: 'RS256',
            data: {uid: result[0].uid, identity},
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
        }, privateKey, (err, token) => {
            if (err) {
                res.status(Code.error).send({code: Code.error, msg: 'token令牌生成失败！'});
            } else {
                res.status(Code.success).send({code: Code.success, token: token});
            }
        });
    } else {
        res.status(Code.success).send({code: Code.failed, msg: '用户信息错误，登录失败！'});
    }
}

/**
 * 接收web客户端轮巡二维码状态的接口
 */
app.post('/roundCodeState', bodyParser.json(), (req, res) => {
    const {random, valid} = req.body;
    if (!valid) {
        res.status(Code.success).send({status: Status.overtime, msg: '二维码已过期！'});
        QRCodeMap.delete(random);
    } else if (!QRCodeMap.get(random)) {
        QRCodeMap.set(random, Status.waiting);
        res.status(Code.success).send({status: Status.waiting, msg: '等待APP扫描二维码！'});
    } else if (QRCodeMap.get(random) === Status.waiting) {
        res.status(Code.success).send({status: Status.waiting, msg: '等待APP扫描二维码！'});
    } else if (QRCodeMap.get(random) === Status.ready) {
        res.status(Code.success).send({status: Status.ready, msg: '等待APP确认登录！'});
    } else if (QRCodeMap.get(random) === Status.refused) {
        res.status(Code.success).send({status: Status.refused, msg: 'APP已拒绝登录！'});
        QRCodeMap.delete(random);
    } else if (QRCodeMap.get(random).startsWith('token:')) {
        res.status(Code.success).send({
            status: Status.success,
            msg: 'APP已允许登录！',
            token: QRCodeMap.get(random).substring(6)
        });
        QRCodeMap.delete(random);
    }
})

/**
 * 接收APP扫描二维码并操作二维码状态的接口
 */
app.post('/qrcode', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    const {QRCode, option} = req.body;
    // console.log(req.body);
    if (!QRCodeMap.get(QRCode)) {
        res.status(Code.refused).send({status: Status.refused, msg: '二维码已过期！'});
    } else {
        jwt.verify(token, privateKey, (err, decode) => {
            if (err) {
                res.status(Code.refused).send({Code: Code.refused, msg: '登录信息已过期！'});
            } else if (option === Code.ready) {
                QRCodeMap.set(QRCode, Status.ready);
                res.status(Code.success).send({status: Status.ready, msg: '等待APP确认登录！'});
            } else if (option === Code.refused) {
                QRCodeMap.set(QRCode, Status.refused);
                res.status(Code.success).send({status: Status.refused, msg: 'APP已拒绝登录！'});
            } else if (option === Code.success) {
                jwt.sign({
                        algorithm: 'RS256',
                        data: decode.data,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
                    }, privateKey, (err, token) => {
                        if (err) {
                            res.status(Code.success).send({status: Status.refused, msg: 'token令牌生成失效，登录失败！'});
                        } else {
                            QRCodeMap.set(QRCode, `token:${token}`);
                            res.status(Code.success).send({status: Status.success, msg: 'APP已允许登录！'});
                        }
                    }
                )
            }
        });
    }

});

/**
 * 更新企业组织信息的接口
 */
app.post('/updateOrgsInfo', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const {data} = req.body;
            updateOrgsInfo(decode.data.identity, data).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '组织信息更新成功！'});
            }).catch(() => {
                res.status(Code.error).send({code: Code.error, msg: '组织信息更新失败！'});
            });
        }
    });
});

/**
 * 获取话题排行的请求接口
 */
app.get('/topicRank', async (_, res) => {
    const result = await getRank();
    res.send(result);
})

app.post('/home', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, async (err, decoded) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: '登录信息已过期，请重新登录！'});
        } else {
            const userInfo = await getUserInfo([decoded.data]);
            res.status(Code.success).send(userInfo);
        }
    })
});


app.post('/register', bodyParser.json(), (req, res) => {
    registerOrg(req.body).then(() => {
        res.status(Code.success).send({state: Status.success, msg: '注册信息写入成功，准备上传文件。'});
    }).catch(err => {
        console.log(err);
        res.status(Code.error).send({state: Status.failed, msg: err});
    });
});

app.post('/upload', (req, res) => {
    const form = formidable({multiples: true});
    form.parse(req, (err, fields, files) => {
        if (err) {
            res.status(Code.error).send({code: Code.error, msg: '服务器接收文件失败！'});
        } else {
            let i = 0;
            const data = {};
            for (let prop in files) {
                const readStream = fs.createReadStream(`${files[prop].path}`);
                const writeStream = fs.createWriteStream(`D:\\Develop Project\\flowingcloud\\src\\resource\\userResource\\${files[prop].name}`);
                readStream.pipe(writeStream);
                readStream.on('end', () => {
                    // console.log(`${files[prop].name}写入完毕！`);
                    i += 1;
                    data[prop] = `resource/userResource/${files[prop].name}`;
                    if (i === 2) {
                        data.identity = files[prop].name.split('_')[0];
                        uploadApplyFile(data).then(() => {
                            res.status(Code.success).send({code: Code.success, msg: '企业注册成功,请等待管理员审核！'});
                        }).catch(() => {
                            res.status(Code.error).send({code: Code.error, msg: '企业注册失败,请联系管理处理或从新注册！'});
                        });
                    }
                })
            }

        }
    });
});

/**
 * 获取企业组织信息
 */
app.get('/orgsInfo', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decoded) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            getOrgsInfo(decoded.data.identity).then(result => {
                res.status(Code.success).send({code: Code.success, orgsInfo: result});
            }).catch(err => {
                res.status(Code.error).send({code: Code.error, msg: INFO.SYSTEM_ERR});
                logger.error(err);
            });

        }
    })
});

/**
 * 添加企业组织的请求接口
 */
app.put('/addOrg', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, async (err, decoded) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: '登录信息已过期，请重新登录！'});
        } else {
            const {code, name, members, tier, parentCode, parentName, sequence, garden, building, room} = req.body;
            insertOrgInfo(decoded.data.identity, [code, name, members, tier, parentCode, parentName, sequence, garden, building, room]).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '组织添加成功！'});
            }).catch((err) => {
                logger.error(err);
                res.status(Code.error).send({code: Code.error, msg: '组织添加失败！'});
            });
        }
    })
});

/**
 * 删除企业组织的请求接口
 */
app.delete('/deleteOrg', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decoded) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            deleteOrg(decoded.data.identity, req.body.code).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '组织删除成功！'});
            }).catch((e) => {
                res.status(Code.error).send({code: Code.error, msg: e.message});
            });
        }
    })
});


app.post('/batchAddMembers', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: '登录信息已过期，请重新登录！'});
        } else {
            const form = formidable({multiples: false});
            form.parse(req, (err, _, files) => {
                    const workbook = new Excel.Workbook();
                    workbook.xlsx.readFile(files.tmpFile.path).then((data) => {
                        const values = data.getWorksheet(1).getSheetValues();
                        // console.log(values);
                    });
                }
            )
        }
    });
});

/**
 * 系统用户登录的请求接口
 */
app.post('/system', bodyParser.json(), (req, res) => {
    //console.log(req.body);
    const {uid, pwd} = req.body;
    verifySysUser(uid, MD5(pwd)).then(result => {
        // console.log(result);
        if (result.length === 0) {
            res.status(Code.success).send({code: Code.refused, msg: '登录失败，请检查账户输入是否正确！'});
        } else {
            if (result[0].state !== 1) {
                //如果状态不正常，则拒绝登录！
                res.status(Code.success).send({code: Code.refused, msg: '账户被冻结或已超过有效期，请联系管理员处理！'});
            } else {
                //判断账户有效期，如超期，则拒绝登录，并同步修改账户状态;
                if (moment().endOf('day') > moment(result[0].end)) {
                    // console.log('账户有效期超期！')
                    res.status(Code.success).send({code: Code.refused, msg: '账户有效期超期，请联系管理员申请延期！'});
                    changeSysUserState(uid, 0).then().catch(err => {
                        logger.error('数据库错误：', err);
                    });
                } else {
                    //账户处于有效期内且正常，曾回执token；
                    jwt.sign({
                        algorithm: 'RS256',
                        data: result[0].uid,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60) * 12
                    }, privateKey, (err, token) => {
                        if (err) {
                            res.status(Code.success).send({code: Code.refused, msg: 'token令牌生成失败！'});
                        } else {
                            const userinfo = {
                                uid: result[0].uid,
                                init: result[0].init,
                                view: result[0].view,
                                approve: result[0].approve,
                                userControl: result[0].userControl,
                                push: result[0].push,
                                app: result[0].app,
                                other: result[0].other
                            };
                            res.status(Code.success).send({code: Code.success, userObj: userinfo, token: token});
                        }
                    });
                }
            }
        }
    }).catch(() => {
        // console.log(err)
        res.status(Code.error).send({code: Code.error, msg: '数据库异常，请联系管理员处理。'});
    });
});

/**
 * 获取密保问题的请求接口
 */
app.get('/questions', (_, res) => {
    // console.log('获取到请求');
    getQuestions().then(result => {
        res.status(Code.success).send(result);
    }).catch(() => {
        res.status(Code.error).send({code: Code.error, msg: '数据库查询失败！'});
    });
});

/**
 * 接受系统管理员账户初始化的接口
 */
app.post('/initSysPwd', bodyParser.json(), (req, res) => {
    // console.log(req.body);
    const {uid, pwd, question1, answer1, question2, answer2, question3, answer3} = req.body;
    const newPwd = MD5(pwd);
    const data = [newPwd, question1, answer1, question2, answer2, question3, answer3, 1, uid];
    initSysPwd(data).then(() => {
        res.status(Code.success).send({code: Code.success, msg: '密码修改成功！'});
    }).catch((e) => {
        console.log(e);
        res.status(Code.error).send({code: Code.error, msg: '密码修改失败！'});
    })
});

/**
 * 获取企业申请列表的请求接口
 */
app.post('/applyOrgs', (req, res) => {
    // console.log('接收到请求')
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌失效，请重新登录！'});
        } else {
            // console.log(decode);
            getApplyOrgs().then(result => {
                res.status(Code.success).send({code: Code.success, result});
            }).catch(err => {
                console.log(err)
                res.status(Code.error).send({code: Code.error, msg: '数据库错误！'})
            });
        }
    });
});

/**
 * 获取企业申请注册信息的请求列表
 */
app.post('/approveInfo', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌失效，请重新登录！'});
        } else {
            const {key} = req.body;
            // console.log(key);
            getApplyInfo(key).then(result => {
                res.status(Code.success).send({code: Code.success, result: result[0]});
            }).catch(err => {
                console.log(err);
                res.status(Code.error).send({code: Code.error, msg: '数据库查询失败！'});
            });
        }
    });
});

/**
 * 响应审批操作的接口
 */
app.post('/approve', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌失效，请重新登录！'});
        } else {
            // console.log(req.body);
            const {identity, opinion, result} = req.body;
            approveOrg(identity, result === 'approve').then((company) => {
                if (result === 'approve') {
                    initCompanyResource(company).then((pwd) => {
                        //发送邮件回执
                        emailTo(company.email, '【飞云注册申请通过】', '', `<p>恭喜您！</p><p>您申请的飞云互联办公系统已经审批通过！您登录的初始密码为${pwd}。飞云将为您的企业带来革命性的办公体验，马上登录体验吧！</p>`, () => {
                            res.status(Code.success).send({code: Code.success, msg: '企业审核通过，企业资源初始化成功！'});
                        })
                    }).catch((err) => {
                        console.log(err);
                        res.status(Code.error).send({code: Code.error, msg: '企业审核通过，企业资源初始化失败！'});
                    });
                } else {
                    //发送邮件回执
                    emailTo(company.email, '【飞云注册申请未通过】', '', `<p>您好！</p><p>您申请的飞云互联办公系统经审批审批未通过！具体原因：${opinion}。您可以再申请，并确保提交的相关信息完善合规。</p>`, () => {
                        res.status(Code.success).send({code: Code.success, msg: '企业审核未通过！'});
                    })
                }
            }).catch((err) => {
                console.log(err);
                res.status(Code.error).send({code: Code.error, msg: '企业信息更新失败！'});
            })
        }
    });
});

/**
 * 校验系统账户是否可用的接口
 */
app.post('/verifySysUid', bodyParser.json(), (req, res) => {
    const {uid} = req.body;
    // console.log(uid);
    verifySysUid(uid).then(result => {
        if (result.length === 0) {
            res.status(Code.success).send({code: Code.success, msg: '该用户不存在，可以注册！'});
        } else {
            res.status(Code.refused).send({code: Code.error, msg: '该用户已存在，不允许重复注册！'});
        }
    }).catch(() => {
        res.status(Code.error).send({code: Code.error, msg: '数据库查询出错！'});
    })
});

/**
 * 创建系统管理员的请求接口
 */
app.post('/addSysUser', bodyParser.json(), (req, res) => {
    // console.log(req.body);
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录。'});
        } else {
            const {userinfo} = req.body;
            userinfo.pwd = MD5(userinfo.pwd);
            // userinfo.mobile=Number.parseInt(userinfo.mobile);
            addSysUser(userinfo).then(() => {
                    res.status(Code.success).send({code: Code.success, msg: '账号添加成功!'});
                }
            ).catch(() => {
                res.status(Code.error).send({code: Code.error, msg: '账号添加失败！'});
            })
        }
    });
});

/**
 * 获取用户授权列表的请求接口
 */
app.post('/authList', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            console.log(err);
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录。'});
        } else {
            getAuthList().then(result => {
                // console.log(result)
                res.status(Code.success).send({code: Code.success, list: result});
            }).catch(e => {
                console.log(e);
                res.status(Code.error).send({code: Code.error, msg: '数据库查询失败！'});
            });
        }
    });
});

/**
 * 删除系统账户信息请求接口
 */
app.delete('/deleteSysUser', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            logger.error('鉴权失败：', err);
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录。'});
        } else {
            const {uid} = req.body;
            deleteSysUser(uid).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '操作成功，账户信息已删除！'});
            }).catch(() => {
                res.status(Code.error).send({code: Code.error, msg: '数据库错误，账户删除失败！'});
            });
        }
    });
});

/**
 * 冻结系统账户信息请求接口
 */
app.put('/freezeSyUser', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            logger.error('鉴权失败：', err);
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录。'});
        } else {
            const {uid} = req.body;
            changeSysUserState(uid, -1).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '账户已冻结！'});
            }).catch((err) => {
                logger.error('数据操作失败：', err);
                res.status(Code.error).send({code: Code.error, msg: '账户状态修改失败！'});
            });
        }
    });
});

/**
 * 激活系统账户信息请求接口
 */
app.put('/activeSyUser', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            logger.error('鉴权失败：', err);
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录。'});
        } else {
            const {uid} = req.body;
            changeSysUserState(uid, 1).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '账户已启用！'});
            }).catch((err) => {
                logger.error('数据操作失败：', err);
                res.status(Code.error).send({code: Code.error, msg: '账户状态修改失败！'});
            });
        }
    });
});

/**
 * 修改系统账户信息请求接口
 */
app.put('/editSysUser', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            logger.error('鉴权失败：', err);
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录。'});
        } else {
            const {state, view, approve, userControl, push, app, other, end, uid} = req.body.data;
            updateSysUser(state, view, approve, userControl, push, app, other, end, uid).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '账户信息更新成功！'});
            }).catch(err => {
                logger.error('数据库操作失败：', err);
                res.status(Code.error).send({code: Code.error, msg: '账户信息更新失败！'});
            })
        }
    });
});

/**
 * 系统管理员获取企业列表的接口
 */
app.post('/getCompaniesList', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录'});
        } else {
            getCompaniesList().then(result => {
                res.status(Code.success).send({code: Code.success, result: result});
            }).catch(err => {
                console.log(err);
                res.status(Code.error).send({code: Code.error, msg: '查询企业信息失败！'});
            });
        }
    });
});

/**
 * 系统管理员导出企业数据的接口
 */
app.post('/exportList', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, err => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录'});
        } else {
            // console.log(req.body);
            exportCompaniesInfo(req.body.keys).then(result => {
                res.status(Code.success).send({code: Code.success, result: result});
            }).catch(err => {
                logger.error(err);
                res.status(Code.err).send({code: Code.error, msg: '企业数据导出失败！'});
            });
        }
    });
});

/**
 * 接收富文本中的文件上传
 */
app.post('/upFile', (req, res) => {
    const form = formidable({multiples: false});
    form.parse(req, (err, fields, files) => {
        if (err) {
            res.status(Code.error).send({code: Code.error, msg: '服务器接收文件失败！'});
        } else {
            const {img} = files;
            // console.log(img);
            const readStream = fs.createReadStream(`${img.path}`);
            const writeStream = fs.createWriteStream(`D:\\Develop Project\\FlyingCloudServer\\public\\images\\userResource\\${img.name}`);
            readStream.pipe(writeStream);
            readStream.on('end', () => {
                console.log(`${img.name}写入完毕！`);
                res.status(Code.success).send({code: Code.success, url: `${serverIP}/images/userResource/${img.name}`});
            })
        }
    });
});

/**
 * 拉取消息模板的请求接口
 */
app.post('/sysMsgTemplate', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录'});
        } else {
            // console.log(decode);
            const {uid} = req.body;
            getTemplateList(uid).then(result => {
                res.status(Code.success).send({code: Code.success, result: result[0]});
            }).catch(err => {
                logger.error('数据库查询失败:', err);
                res.status(Code.error).send({code: Code.error, msg: '数据库查询失败！'});
            });
        }
    });
});

/**
 * 更新消息模板目录的请求
 */
app.post('/updateSysMsgTemplateDir', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌已过期，请重新登录'});
        } else {
            const {uid, templates} = req.body;
            updateTemplateList(uid, templates).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '消息模板目录更新成功！'});
            }).catch(err => {
                res.status(Code.error).send({code: Code.error, msg: '消息模板目录更新失败！'});
                logger.error(`用户${uid}消息目录更新失败：`, err);
            });
        }
    });
});

/**
 * 获取产品商城内增值产品以及购物车、促销等信息的接口
 */
app.get('/productInfo', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const data = {code: Code.success};
            getPayingProductInfo().then(result => {
                data.product = result;
                getShoppingProduct(decode.data.identity).then(result1 => {
                    data.shopping = result1;
                    res.status(Code.success).send(data);
                }).catch(err1 => {
                    console.log(err1);
                    res.status(Code.error).send({code: Code.error, msg: INFO.DATABASE_QUERY_ERR});
                });
            }).catch(err => {
                console.log(err);
                res.status(Code.error).send({code: Code.error, msg: INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 查询工号的接口
 */
app.get('/jobNum', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const {jobNum} = req.query;
            getJobNum(decode.data.identity, jobNum).then(result => {
                res.status(Code.success).send({code: Code.success, jobNum: result});
            }).catch(err => {
                logger.error(err);
                res.status(Code.error).send({code: Code.error, msg: INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 查询账号的接口
 */
app.get('/uid', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const {uid} = req.query;
            getUid(decode.data.identity, uid).then(result => {
                res.status(Code.success).send({code: Code.success, uid: result});
            }).catch(err => {
                logger.error(err);
                res.status(Code.error).send({code: Code.error, msg: INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 查询用户姓名的接口
 */
app.get('/userName', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const {name} = req.query;
            getUserName(decode.data.identity, name).then(result => {
                res.status(Code.success).send({code: Code.success, name: result});
            }).catch(err => {
                logger.error(err);
                res.status(Code.error).send({code: Code.error, msg: INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 获取公共权限列表的接口
 */
app.get('/permission', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            getCommonPermission().then(result => {
                res.status(Code.success).send({code: Code.success, result: result});
            }).catch(err => {
                logger.error(err);
                res.status(Code.error).send({code: Code.error, msg: INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 创建角色的接口
 */
app.post('/role', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const {name, level, permission, cloud_storage} = req.body;
            createRole(decode.data.identity, name, level, permission, cloud_storage).then(() => {
                    res.status(Code.success).send({code: Code.success, msg: INFO.DATABASE_QUERY_SUCCESS});
                }
            ).catch(err=>{
                logger.error(err);
                res.status(Code.error).send({code: Code.error, msg: INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 获取角色的接口
 */
app.get('/role',(req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            getRolesInfo(decode.data.identity).then(result=>{
                res.status(Code.success).send({code:Code.success,roles:result});
            }).catch(err=>{
                logger.error(err);
                res.status(Code.error).send({code:Code.error,msg:INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 修改角色的接口
 */
app.put('/role',bodyParser.json(),(req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const {name, level, permission, cloud_storage} = req.body;
            updateRoleInfo(decode.data.identity,name, level, permission, cloud_storage).then(()=>{
                res.status(Code.success).send({code:Code.success,msg:INFO.DATABASE_QUERY_SUCCESS});
            }).catch(err=>{
                logger.error(err);
                res.status(Code.error).send({code:Code.error,msg:INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 删除角色的接口
 */
app.delete('/role',bodyParser.json(),(req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const {name} = req.body;
            deleteRoleInfo(decode.data.identity,name).then(()=>{
                res.status(Code.success).send({code:Code.success,msg:INFO.DATABASE_QUERY_SUCCESS});
            }).catch(err=>{
                logger.error(err);
                res.status(Code.error).send({code:Code.error,msg:INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 通过模糊查询获取候选用户列表
 */
app.get('/candidate',(req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            // console.log(req.query);
            getCandidateUsers(decode.data.identity,req.query.key).then(result=>{
                res.status(Code.success).send({code:Code.success,users:result});
            }).catch(err=>{
                logger.error(err);
                res.status(Code.error).send({code:Code.error,msg:INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

/**
 * 创建企业成员的接口
 */
app.post('/user',bodyParser.json(),(req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: INFO.TOKEN_DATE_OUT});
        } else {
            const {uid,jobNum,name,sex,phone,shortPhone,email,orgCode,orgName,post,leader}=req.body;
            createUser(decode.data.identity,[uid,jobNum,name,sex,phone,shortPhone,email,orgCode,orgName,post,leader]).then(()=>{
                res.status(Code.success).send({code:Code.success,msg:INFO.DATABASE_QUERY_SUCCESS});
            }).catch(err=>{
                logger.error(err);
                // console.log(err);
                res.status(Code.error).send({code:Code.error,msg:INFO.DATABASE_QUERY_ERR});
            });
        }
    });
});

