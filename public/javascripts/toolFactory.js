/**
 * 工具工厂，公共方法，减少重复代码
 */

class ToolFactory {
    /**
     * 绑定图片按钮与密码框，通过图片按钮切换密码框的显示/隐藏,支持批量绑定
     * 要求图片按钮与密码框在同一个父节点下
     * @param imgClassName 图片按钮的类名
     * @param pwdClassName 密码框的类名
     */
    static bindImgWithPwd(imgClassName, pwdClassName, hiddenSrc, showSrc) {
        let imgBtuS = document.querySelectorAll(imgClassName);
        for (let item of imgBtuS) {
            item.addEventListener('click', (event) => {
                event.preventDefault();
                let pwd = item.parentNode.getElementsByClassName(pwdClassName)[0];
                if (pwd.type == 'password') {
                    pwd.type = 'text';
                    item.src = hiddenSrc;
                } else {
                    pwd.type = 'password';
                    item.src = showSrc;
                }
            });
        }
    }

    /**
     * 创建banner动画效果
     * @param bannerID banner容器ID
     * @param navID 导航按钮ID
     * @param bannerWidth banner显示宽度
     * @param navWidth 按钮显示宽度
     * @param timeout banner动画间隔
     */
    static bannerAnimation(bannerID, navID, bannerWidth, navWidth, timeout,) {
        let timerID = 0;
        let box = document.getElementById(bannerID);
        box.style.transitionDuration = '1s';
        let imgArr = box.getElementsByTagName('img');
        let nav = document.getElementById(navID);
        let updateLocation = () => {
            box.style.transitionDuration = '1s';
            let left = parseInt(document.defaultView.getComputedStyle(box).left);
            box.style.left = left - bannerWidth + 'px';
        };
        box.style.width = imgArr.length * bannerWidth + 'px';
        for (let i = 0; i < imgArr.length - 1; i++) {
            let li = document.createElement('li');
            li.id = navID + i;
            if (i == 0)
                li.style.background = '#ffffff';
            else
                li.style.background = '#FF6666';
            li.addEventListener('click', () => {
                box.style.transitionDuration = '1s';
                box.style.left = 0 - i * bannerWidth + 'px';
                window.clearInterval(timerID);
                timerID = setInterval(updateLocation, timeout);
            });
            nav.appendChild(li);
        }
        nav.style.left = (bannerWidth - (imgArr.length - 1) * navWidth) / 2 + 'px';
        box.addEventListener('transitionend', () => {
            let index = -parseInt(document.defaultView.getComputedStyle(box).left) / bannerWidth;
            if (index >= (imgArr.length - 1)) {
                box.style.transitionDuration = '0s';
                box.style.left = '0px';
                window.clearInterval(timerID);
                timerID = setInterval(updateLocation, timeout);
                index = 0;
            }
            for (let i = 0; i < nav.getElementsByTagName('li').length; i++) {
                let li = document.getElementById(navID + i);
                li.style.background = '#FF6666';
            }
            document.getElementById(navID + index).style.background = '#ffffff';
        })
        timerID = setInterval(updateLocation, timeout);
    }

}