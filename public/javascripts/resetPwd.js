/**
 * 为表单绑定动画监听事件，动画结束后更新进度栏状态
 */
let form = document.forms[0];
form.addEventListener('transitionend', () => {
    let top = parseInt(document.defaultView.getComputedStyle(form).top);
    let parentNode = document.getElementById('progress');
    let changeState = function (className) {
        let elements = parentNode.querySelectorAll('div');
        for (let element of elements) {
            element.style.border = 'solid 1px #CCCCCC';
            element.style.background = '#F7F7F7';
            element.style.color='black';
        }
        if (className == '')
            return;
        let targetElements = parentNode.querySelectorAll(className);
        for (let element of targetElements) {
            element.style.border = 'none';
            element.style.background = '#35E558';
            element.style.color = 'white';
        }
    };
    switch (-top / 450) {
        case 0:
            changeState('');
            break;
        case 1:
            changeState('.first');
            break;
        case 2:
            changeState('.first,.second');
            break;
        case 3:
            changeState('.first,.second,.third,.fourth');
            let timer = 5;
            let p = document.querySelector('p');
            p.innerText = `密码修改成功！${timer}s后跳转到登录页面......`;
            let timerID = setInterval(() => {
                if (timer <= 5 && timer > 0) {
                    timer--;
                    p.innerText = `密码修改成功！${timer}s后跳转到登录页面......`;
                } else {
                    clearInterval(timerID);
                    location.href = 'index.html';
                }
            }, 1000)
            break;

    }
});

/**
 *为验证码按钮绑定监听事件，点击后禁用，60s后再次启用
 */
let codeBtu = document.getElementById('getCode');
codeBtu.addEventListener('click', () => {
    codeBtu.disabled = true;
    let timer = 60;
    let timerID = setInterval(() => {
        if (timer <= 60 && timer > 0) {
            timer--;
            codeBtu.value = `${timer}s后重新获取`;
        } else {
            clearTimeout(timerID);
            codeBtu.value = '获取验证码';
            codeBtu.disabled = false;
        }
    }, 1000);
});

/**
 *为继续及上一步按钮绑定监听事件
 */
let next_first = document.getElementById('next-first');
next_first.addEventListener('click', (event) => {
    event.preventDefault();
    form.style.top = '-450px';
});
let next_second = document.getElementById('next-second');
next_second.addEventListener('click', (event) => {
    event.preventDefault();
    form.style.top = '-900px';
});
let next_third = document.getElementById('next-third');
next_third.addEventListener('click', (event) => {
    event.preventDefault();
    form.style.top = '-1350px';
});
let previous_second = document.getElementById('previous-second');
previous_second.addEventListener('click', (event) => {
    event.preventDefault();
    form.style.top = '0px';
})
let previous_third = document.getElementById('previous-third');
previous_third.addEventListener('click', (event) => {
    event.preventDefault();
    form.style.top = '-450px';
});

/**
 * 绑定显示/隐藏按钮与密码文本框的联动
 */
ToolFactory.bindImgWithPwd('.imgBtu','userPwd','img/hidden.png','img/show.png');