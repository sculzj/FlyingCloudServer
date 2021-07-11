/**
 * 时间格式化为 YY-MM-DD HH:mm:ss
 * @param date
 */
function dateFormat(date) {
    const year=date.getFullYear();
    const month=(date.getMonth()+1).length>1?date.getMonth()+1:'0'+(date.getMonth()+1);
    const day=date.getDate().length>1?date.getDate():'0'+date.getDate();
    const hour=date.getHours().length>1?date.getHours():'0'+date.getHours();
    const minutes=date.getMinutes().length>1?date.getMinutes():'0'+date.getMinutes();
    const seconds=date.getSeconds().length>1?date.getSeconds():'0'+date.getSeconds();
    return `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`;
}

module.exports={dateFormat};