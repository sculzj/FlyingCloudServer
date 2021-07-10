$(".state.view").click((event) => {
        $(".state.hidden").show(0,()=>{
            $(".state.hidden li").click((event)=>{
                $(".state.view li")[0].innerHTML=event.target.innerHTML;
            });
            $(document).click(() => {
                $(".state.hidden").hide();
            });
        });
        event.stopPropagation();
    }
);
$(".mood.view").click((event) => {
        console.log('检测到点击事件');
        $(".mood.hidden").show(0,()=>{
            $(".mood.hidden li").click((event)=>{
                $(".mood.view li")[0].innerHTML=event.target.innerHTML;
            });
            $(document).click(() => {
                $(".mood.hidden").hide();
            });
        });
        event.stopPropagation();
    }
)
