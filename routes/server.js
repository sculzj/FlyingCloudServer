/**
 * 引入三方模块
 */
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const {nanoid} = require('nanoid');
const MD5 = require('MD5');
const formidable = require('formidable');
const Excel = require('exceljs');
const {emailTo} = require("./mailServer");
const {
    verifyUser,
    getProductInfo,
    getRank,
    getUserInfo,
    verifyOrgCode,
    registerOrg,
    verifyOrgEmail,
    verifyOrg,
    updateOrgGroup,
    getOrganizations,
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
    approveOrg
} = require('./mysqlMiddleWare');
/**
 * 引入自定义模块
 */
const logger = require('./log-component').logger;
const privateKey = fs.readFileSync('../key/private.key');
const {Status, Code} = require('./constants');
// const {verifyUserLogin,getProductInfo} = require('./redisMiddleWare');

const app = express();
const BufferQueue = new Map();

// app.use(express.static('../public'));
app.listen('7080', () => {
    logger.info('服务器已启动......')
});

/**
 * 接收登录请求，验证用户登录信息，根据验证状态执行动作
 * success:验证成功返回登录token
 * refused:验证失败拒绝登录
 * error:数据库错误或其他错误
 */
app.post('/login', bodyParser.json(), async (req, res) => {
    try {
        //根据登录账号类型进行校验
        let result = '';
        if (req.body.admin) {
            result = await verifyOrg([req.body.userId, MD5(req.body.pwd)]);
        } else {
            result = await verifyUser([req.body.userId, MD5(req.body.pwd)]);
        }
        jwt.sign({
            algorithm: 'RS256',
            data: result.userId ? result.userId : result.orgEmail,
            exp: Math.floor(Date.now() / 1000) + (60 * 60) * 12
        }, privateKey, (err, token) => {
            if (err) {
                res.status(Code.success).send({code: Code.error, msg: err});
            } else {
                res.status(Code.success).send({code: Code.success, token, userInfo: result});
            }
        });
    } catch (err) {
        logger.error(`${req.body.userId}登录失败：${err}`);
        res.status(Code.error).send({state: Status.error, msg: err});
    }
});

/**
 * 接收二维码登录请求，首次请求生成临时token并返回，客户端携带token轮询二维码状态
 * 通过Map维护二维码临时状态
 */
app.post('/qrcode', (req, res) => {
    const token = req.headers.authorization;
    if (token) {
        //非首次请求校验临时token是否有效
        jwt.verify(token, privateKey, (err, _) => {
            if (err) {
                res.send({code: Code.overtime, msg: "二维码已超时，请重新获取。"});
                BufferQueue.delete(token);
            } else {
                const {state} = BufferQueue.get(req.headers.authorization);
                if (state === Status.waiting) {
                    res.status(Code.success).send({code: Code.success, msg: "等待扫描二维码。"});
                } else if (state === Status.ready) {
                    res.status(Code.success).send({code: Code.success, msg: "请在App上进行登录确认。"});
                } else if (state === Status.success) {
                    const {result} = BufferQueue.get(token);
                    res.status(Code.success).send({code: Code.success, result});
                    BufferQueue.delete(token);
                } else if (state === Status.refused) {
                    res.status(Code.refused).send({code: Code.refused, msg: "已取消二维码登录。"});
                    BufferQueue.delete(token);
                }
            }
        });
    } else {
        //首次请求生成二维码临时token，有效期120s
        const id = nanoid();
        jwt.sign({
            algorithm: 'RS256',
            data: id,
            exp: Math.floor(Date.now() / 1000) + (2 * 60)
        }, privateKey, (err, token) => {
            if (err)
                res.status(Code.error).send({code: Code.error, msg: '二维码拉取失败！'});
            else {
                //将临时token推入缓存区，并返回给客户端
                BufferQueue.set(token, {state: Status.waiting, result: ""});
                res.status(Code.success).send({code: Code.success, token});
            }
        });
    }
});

/**
 * 接收扫描二维码请求，进行App的token和二维码的token双重校验
 * 通过Map维护二维码的临时状态
 */
app.post('/scanCode', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    const {tmpToken, isAllow} = req.body;
    jwt.verify(token, privateKey, (err, _) => {
        if (err) {
            res.send({code: Code.error, msg: "token已过期，请重新登录！"});
            return;
        }
        jwt.verify(tmpToken, privateKey, (error, result) => {
            if (error) {
                res.send({code: Code.error, msg: "二维码已过期，请重新扫描！"});
                return;
            }
            if (BufferQueue.get(tmpToken).state === Status.waiting) {
                BufferQueue.get(tmpToken).state = Status.ready;
                res.status(Code.success).send({code: Code.success, msg: "二维码已就绪，等待登录！"});
            } else if (BufferQueue.get(tmpToken).state === Status.ready) {
                if (isAllow) {
                    jwt.sign({
                        algorithm: 'RS256',
                        data: result.data,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60)
                    }, privateKey, (err, newToken) => {
                        if (err) {
                            res.status(Code.error).send({code: Code.error, msg: "生成令牌失败！"});
                        } else {
                            BufferQueue.get(tmpToken).result = newToken;
                            BufferQueue.get(tmpToken).state = Status.success;
                            res.status(Code.success).send({code: Code.success, login: true});
                        }
                    });
                } else {
                    BufferQueue.get(tmpToken).state = Status.refused;
                    res.status(Code.success).send({code: Code.success, msg: '已取消二维码登录！'});
                }
            } else {
                res.status(Code.error).send({code: Code.error, msg: '二维码已失效，请重新获取登录二维码！'});
            }
        })
    })
});

app.get('/product', async (_, res) => {
    try {
        const result = await getProductInfo();
        res.status(Code.success).send(result);
    } catch (e) {

    }
});

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

app.post('/verifyOrgCode', bodyParser.json(), async (req, res) => {
    const result = await verifyOrgCode(req.body.code);
    try {
        if (result) {
            res.status(Code.success).send({state: Status.success, msg: '该企业已注册!'});
        } else {
            res.status(Code.success).send({state: Status.failed, msg: '该企业未注册！'});
        }
    } catch (e) {

    }
});

app.post('/verifyOrgEmail', bodyParser.json(), async (req, res) => {
    try {
        const result = await verifyOrgEmail(req.body.email);
        if (result) {
            res.status(Code.success).send({state: Status.success, msg: '该企业已注册!'});
        } else {
            res.status(Code.success).send({state: Status.failed, msg: '该企业未注册！'});
        }
    } catch (e) {

    }
});

/**
 * 实时验证识别码的请求接口
 */
app.post('/verifyIdentity', bodyParser.json(), async (req, res) => {
    try {
        await verifyIdentity(req.body.identity);
        res.status(Code.success).send({state: Status.success, msg: '该识别码可以使用！'});
    } catch (e) {
        res.status(Code.error).send({state: Status.error, msg: e.message});
    }
});

app.post('/register', bodyParser.json(), async (req, res) => {
    try {
        // console.log(req.body);
        const result = await registerOrg(req.body);
        res.status(Code.success).send({state: Status.success, msg: result});
    } catch (err) {
        res.status(Code.error).send({state: Status.failed, msg: err});
    }
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

app.post('/orgGroup', (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, async (err, decoded) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: '登录信息已过期，请重新登录！'});
        } else {
            const result = await getOrganizations(decoded.data);
            res.status(Code.success).send({code: Code.success, groups: result});
        }
    })
});

app.put('/orgGroup', bodyParser.json(), async (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, async (err, decoded) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: '登录信息已过期，请重新登录！'});
        } else {
            try {
                const result = await updateOrgGroup(decoded.data, req.body);
                res.status(Code.success).send({code: Code.success, msg: result});
            } catch (err) {
                res.status(Code.error).send({code: Code.error, msg: err});
            }
        }
    })
});

app.put('/addGroup', bodyParser.json(), async (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, async (err, decoded) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: '登录信息已过期，请重新登录！'});
        } else {
            try {
                const result = await insertGroupInfo(decoded.data, req.body);
                res.status(Code.success).send({code: Code.success, msg: result});
            } catch (e) {
                res.status(Code.error).send({code: Code.error, msg: e.message});
            }
        }
    })
});

app.delete('/deleteGroup', bodyParser.json(), async (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, async (err, decoded) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: '登录信息已过期，请重新登录！'});
        } else {
            deleteGroup(decoded.data, req.body.groupCode).then(() => {
                res.status(Code.success).send({code: Code.success, msg: '组织删除成功！'});
            }).catch((e) => {
                res.status(Code.error).send({code: Code.error, msg: e.message});
            });
        }
    })
});

app.put('/orderOrgGroup', bodyParser.json(), (req, res) => {
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err, decode) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: '登录信息已过期，请重新登录！'});
        } else {
            try {
                updateRankIndex(decode.data, req.body).then(() => {
                    res.status(Code.success).send({code: Code.success, msg: '组织顺序更新成功！'});
                });
            } catch (e) {
                res.status(Code.error).send({code: Code.error, msg: e.message});
            }
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

app.post('/system', bodyParser.json(), (req, res) => {
    // console.log(req.body);
    const {uid, pwd} = req.body;
    verifySysUser(uid, MD5(pwd)).then(result => {
        // console.log(result);
        if (result.length === 0) {
            res.status(Code.success).send({code: Code.error, msg: '用户不存在！'});
        } else {
            jwt.sign({
                algorithm: 'RS256',
                data: result.uid,
                exp: Math.floor(Date.now() / 1000) + (60 * 60) * 12
            }, privateKey, (err, token) => {
                if (err) {
                    res.status(Code.success).send({code: Code.error, msg: 'token令牌生成失败！'});
                } else {
                    const userinfo = {uid: result[0].uid, init: result[0].init};
                    res.status(Code.success).send({code: Code.success, userObj: userinfo, token: token});
                }
            });
        }
    }).catch(() => {
        // console.log(err)
        res.status(Code.error).send({code: Code.error, msg: '数据库异常，请联系管理员处理。'});
    });
});

app.get('/questions', (_, res) => {
    // console.log('获取到请求');
    getQuestions().then(result => {
        res.status(Code.success).send(result);
    }).catch(() => {
        res.status(Code.error).send({code: Code.error, msg: '数据库查询失败！'});
    });
});

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

app.post('/applyOrgs', (req, res) => {
    // console.log('接收到请求')
    const token = req.headers.authorization;
    jwt.verify(token, privateKey, (err) => {
        if (err) {
            res.status(Code.refused).send({code: Code.refused, msg: 'token令牌失效，请重新登录！'});
        } else {
            getApplyOrgs().then(result => {
                res.status(Code.success).send({code: Code.success, result});
            }).catch(reason => {
                // console.log(reason)
                res.status(Code.error).send({code: Code.error, msg: '数据库错误！'})
            });
        }
    });
});

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
            console.log(req.body);
            const {identity, opinion, result} = req.body;
            approveOrg(identity, result === 'approve').then((email) => {
                if (result === 'approve') {
                    initOrgResource(identity).then(() => {
                        //发送邮件回执
                        emailTo(email, '【飞云注册申请通过】', '', '<p>恭喜您！</p><p>您申请的飞云互联办公系统已经审批通过！飞云将为您的企业带来革命性的办公体验，马上登录体验吧！</p>', () => {
                            res.status(Code.success).send({code: Code.success, msg: '企业审核通过，企业资源初始化成功！'});
                        })
                    }).catch((err) => {
                        console.log(err);
                        res.status(Code.error).send({code: Code.error, msg: '企业审核通过，企业资源初始化失败！'});
                    });
                } else {
                    //发送邮件回执
                    emailTo(email, '【飞云注册申请未通过】', '', `<p>您好！</p><p>您申请的飞云互联办公系统经审批审批未通过！具体原因：${opinion}。请登录飞云互联完善相关信息及资料后再次提交申请。</p>`, () => {
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