import './jquery';
import './toolFactory';
import '../stylesheets/indexMain.css';
import '../stylesheets/commonStyle.css';

/**
 * 创建banner动画效果
 */
ToolFactory.bannerAnimation('imgBox','bannerNav',1600,120,3000);

/**
 * 绑定显示/隐藏按钮与密码文本框的联动
 */
ToolFactory.bindImgWithPwd('.imgBtu','userPwd','images/hidden.png','images/show.png');

/**
 * 文档加载完成后，为提交按钮绑定HTTP异步请求事件
 * 表单里的文本框必须有name属性，否则获取不到数据！！！
 */
(function () {
    $("#login-form .submit").click(()=>{
        let options={
            type:'POST',
            url:'/login',
            data:$("#login-form").serialize(),
            complete:function (XHR,TS) {
                const tarLocation=XHR.getResponseHeader('location');
                switch (TS) {
                    case 'success':
                        //登录成功，重定向到工作台，并保存userID数据
                        window.localStorage.setItem('User',$("#login-form").serialize());
                        window.location.href=tarLocation;
                        break;
                    case 'error':
                        window.location.href=tarLocation;
                        break;
                }
            }
        };
        $.ajax(options);
    });
})();
(function () {
    $("#busSign").click(()=>{
        $.get('/busSign');
    });
})();
