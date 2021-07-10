/**
 * 省市联动下拉菜单脚本
 */
class Province {
    /**
     * 省份的构造函数
     * @param name 省份名称
     * @param citiesList 省份下辖地市的列表，以数组形式存在
     */
    constructor(name, citiesList) {
        this.name = name;
        this.citiesList = citiesList;
    }

    /**
     * 省份创建option节点，并添加到省份下拉菜单，同时为option添加change事件监听，动态更新地市下拉菜单
     * @param source 触发更新操作的源，即省份下拉菜单
     * @param target 更新操作的目标，即地市下拉菜单
     */
    bindAction(source, target) {
        let option = document.createElement('option');
        option.value = this.name;
        option.innerText = this.name;
        source.appendChild(option);
        source.addEventListener('change', () => {
            if (source.value == this.name) {
                let options = target.getElementsByTagName('option');//获取地市下拉菜单当前的列表
                let length = options.length;
                if (length <= this.citiesList.length) {//如果当前列表的长度小于省份下辖的地市数量，则按序替换现有的列表项值与文本，
                    //超出当前列表长度的则动态增加列表项
                    for (let i = 1; i <= this.citiesList.length; i++) {
                        if (i <= options.length - 1) {
                            options[i].value = this.citiesList[i - 1];
                            options[i].innerText = this.citiesList[i - 1];
                        } else {
                            let option = document.createElement('option');
                            option.value = this.citiesList[i - 1];
                            option.innerText = this.citiesList[i - 1];
                            target.appendChild(option);
                        }
                    }
                } else {//如果当前列表长度大于省份下辖的地市数量，则按序替换现有列表项的文本，超出地市数量的部分倒序删除
                    for (let i = 1; i <= this.citiesList.length; i++) {
                        options[i].value = this.citiesList[i - 1];
                        options[i].innerText = this.citiesList[i - 1];
                    }
                    for (let i = length - 1; i > this.citiesList.length; i--) {
                        target.removeChild(options[i]);
                    }
                }
            }
        });
    }
}

//构造省份对象，统一保存到省份数组中
let Beijing = new Province('北京', ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '顺义区', '通州区', '大兴区', '房山区', '门头沟区',
    '昌平区', '平谷区', '密云区', '怀柔区', '延庆区']);
let Shanghai = new Province('上海', ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区',
    '金山区', '松江区', '青浦区', '奉贤区', '崇明区']);
let Tianjin = new Province('天津', ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '滨海新区', '东丽区', '西青区', '津南区', '北辰区',
    '武清区', '宝坻区', '宁河区', '静海区', '蓟州区']);
let Chongqing = new Province('重庆', ['渝中区', '万州区', '涪陵区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '綦江区', '大足区',
    '渝北区', '巴南区', '黔江区', '长寿区', '江津区', '合川区', '永川区', '南川区', '璧山区', '铜梁区', '荣昌区', '潼南区', '开州区', '梁平区', '武隆区', '城口县', '丰都县', '垫江县',
    '忠县', '云阳县', '奉节县', '巫山县', '巫溪县', '石柱土家族自治县', '秀山土家族苗族自治县', '酉阳土家族苗族自治县', '彭水苗族土家族自治县']);

//请按照实际需求构造省份对象，并加入数组中即可
let provinceList = [Beijing, Shanghai, Tianjin, Chongqing];

/**
 * 绑定省市两级下拉带单联动
 * @param source 省级下拉菜单
 * @param target 市级下拉菜单
 */
function bindProvinceWithCity(province, city) {
    for (let i = 0; i < provinceList.length; i++) {
        provinceList[i].bindAction(province, city);
    }
}

