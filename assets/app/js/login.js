function genUid(){
	return new Date().getTime()+""+Math.floor(Math.random()*899+100);
}

//用户提交昵称
function usernameSubmit(){
	var username = document.getElementById("username").value;
	var state = document.getElementById("state").value;
	////防止xss攻击，过滤掉
	//username = filterXSS(username,{
	//	whiteList:          [],        // 白名单为空，表示过滤所有标签
	//		stripIgnoreTag:     true,      // 过滤所有非白名单标签的HTML
	//		stripIgnoreTagBody: ['script'] // script标签较特殊，需要过滤标签中间的内容
	//});
	//username = username.replace('/"/g','');
	//username = username.replace('/?/g','');
	//username = username.replace('/&/g','');
	var userid = genUid();
	if(username != ""){
		document.getElementById("username").value = '';
		if(state == 1) {//直播
			window.location = "/haishen/room/testroom?username="+username+"&userid="+userid
		}else{//专家讲堂
			window.location = "/haishen/list?username=" + username + "&userid=" + userid
		}
	}
	return false;
}

//用户跳过昵称，缺省为用户分配一个游客昵称
function usernameSkip(){
	var state = document.getElementById("state").value;
	var userid = this.genUid();
	var username = "游客"+userid;
	if(state == 1) {//直播
		window.location = "/haishen/room/testroom?username="+username+"&userid="+userid
	}else{//专家讲堂
		window.location = "/haishen/list?username=" + username + "&userid=" + userid
	}
	return false;
}

//通过“回车”提交用户名
document.getElementById("username").onkeydown = function(e) {
	e = e || event;
	if (e.keyCode === 13) {
		usernameSubmit();
	}
};