/**
 * 营业执照文本框监听事件，上传文件后显示文件名并隐藏提示信息
 */
let srcInput = document.getElementById('license');
srcInput.addEventListener('change', () => {
    let tarInput = document.getElementById('licenseInfo');
    if (srcInput.files.length > 0) {
        let file = srcInput.files[0];
        tarInput.value = file.name;
        let div = document.getElementById('divOfLicense');
        div.style.overflow = 'hidden';
    }
});

/**
 * 法人授权书文本框监听事件，上传文件后显示文件名并隐藏提示信息
 */
let authInput = document.getElementById('authorization');
authInput.addEventListener('change', () => {
    let tarInput = document.getElementById('authorizationInfo');
    if (authInput.files.length > 0) {
        let file = authInput.files[0];
        tarInput.value = file.name;
        let div = document.getElementById('divOfAuth');
        div.style.overflow = 'hidden';
    }
});

/**
 * 邮箱文本框监听事件，输入邮箱后隐藏提示信息
 */
let email = document.getElementById('email');
email.addEventListener('change', () => {
    let div = document.getElementById('divOfEmail');
    if (email.value != '') {
        div.style.overflow = 'hidden';
    } else {
        div.style.overflow = 'visible';
    }
});

/**
 *绑定省市下拉菜单联动关系
 */
let province = document.getElementById('provinceList');
let city = document.getElementById('cityList');
bindProvinceWithCity(province,city);

