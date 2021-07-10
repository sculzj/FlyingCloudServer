(()=>{
    const options={
        type:'POST',
        url:'/workspace',
        data:window.localStorage.getItem('User'),
        success:function(result){
            document.write(result);
            document.close();//写入服务器渲染的模板，完成后需要关闭文档流，否则一直保持请求状态！
        },
        error:function(){
            window.location.href='http://127.0.0.1:7080/err.html';
            window.localStorage.removeItem('User');
        }
    };
    $.ajax(options);
})();