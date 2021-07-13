/**
 * 邮件发送服务
 */

const nodemailer = require("nodemailer");

function emailTo(email,subject,text,html,callback) {
    const transporter = nodemailer.createTransport({
        host: "smtp.qq.com",
        auth: {
            user: "1301495471@qq.com",
            pass: "ydmsovxreeunfigd"

        }
    });
    const mailOptions = {
        from: "1301495471@qq.com",
        to: email,
        subject: subject,
    };
    if(text)
    {
        mailOptions.text =text;
    }
    if(html)
    {
        mailOptions.html =html;
    }

    try {
        transporter.sendMail(mailOptions, function (err) {
            if (err) {
                result.httpCode = 500;
                result.message = err;
                callback(result);
                return;
            }
            callback();
        });
    } catch (err) {
        result.httpCode = 500;
        result.message = err;
        callback();
    }
}

exports.emailTo=emailTo;