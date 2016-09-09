var msgObj=document.getElementById("message");

function genUid(){
	return new Date().getTime()+""+Math.floor(Math.random()*899+100);
}

//连接websocket后端服务器
var socket = io.connect('ws://haishen-comments.daoapp.io/haishen',{"transports":[ 'polling']});
//var socket= io.connect('ws://localhost:3000/haishen',{"transports":[ 'polling']});
//var socket= io.connect('ws://4k.evideocloud.com/haishen',{"transports":[ 'polling']});
var userid = genUid();
var username = "admin"+userid;

socket.emit('join',  {userid:userid, username:username,roomID:'zhiboroom'});

//监听新用户登录
socket.on('join', function(o){
	updateSysMsg(o, 'join');
});

//监听新用户登录
socket.on('leave', function(o){
	updateSysMsg(o, 'leave');
});

//监听删除评论
socket.on('del', function(o){
	msgObj.removeChild(document.getElementById(o.commentid));
});

//监听消息发送
socket.on('message', function(obj){
	var contentDiv = '<h1>'+obj.content+'</h1>';
	var user_timeDiv = '<h2>'+obj.username+'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'+obj.times+'</h2>';

	var section = document.createElement('li');
	section.id = obj.commentid;
	section.innerHTML = "<img src = '/assets/app/img/tuding.jpg' /><div class='user-head'><img src ="+ obj.headimgurl +" alt=''/></div><div class='user-content'><div>"+user_timeDiv + contentDiv+"</div></div>";
	msgObj.insertBefore(section,msgObj.childNodes[1]);
});


//更新系统消息，本例中在用户加入、退出的时候调用
function updateSysMsg(o, action){
	//当前总的在线用户列表
	//var onlineUsers = o.onlineUsers;
	//当前总的在线人数
	//var onlineCount = o.onlineCount;
	//新加入用户的信息
	var user = o.user;

	var roomCount = o.roomCount;

	document.getElementById("onlinecount").innerHTML = '<h1 style="float:left;font-weight:bold;">&nbsp;直&nbsp;播&nbsp;留&nbsp;言&nbsp;板&nbsp;</h1><sppan style=" font-size:14px; color:#708090;"> 当前共有'+roomCount+' 人在线</span>';

	//如果是新加入的用户，显示最近几条信息
	if(user.username == username){
		for(var i= 0;i<o.room.length;i++){
			var contentDiv = '<h1>'+o.room[i].comment+'</h1>';
			var user_timeDiv = '<h2>'+o.room[i].username+'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'+o.room[i].times+'</h2>';
			var section = document.createElement('li');
			section.id = o.room[i].commentid;
			section.innerHTML = "<img src = '/assets/app/img/tuding.jpg' /><div class='user-head'><img src ="+ o.room[i].headimgurl +" alt=''/></div><div class='user-content'><div>"+user_timeDiv + contentDiv+"</div></div>";
			msgObj.appendChild(section);
		}
	}
}