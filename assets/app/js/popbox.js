// popbox.js,点击/悬浮放大效果
$(document).ready(function(){
	//二维码点击放大效果
	$(".qrcode").click(function(){
	    var $qrcode=$(this);
	    if($qrcode.css("z-index") != "10086"){
	      $qrcode.animate({
	        'width':'500px',
	        'height':'500px',
	        
	        'margin-top':'50px',
	        'margin-right':'-250px',
	        'z-index':'10086'
	      },500);
	    }
	    else{
	      $qrcode.animate({
	        'width':'120px',
	        'height':'120px',
	        
	        'margin-top':'40px',
	        'margin-left':'50px',
	        'z-index':'1000'
	      },500);
	    }
	});
	
});
