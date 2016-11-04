function getQueryString(name){
	var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
	var r = window.location.search.substr(1).match(reg);
	if (r != null) return unescape(r[2]); return null;
}

function getroomID(){
	var url = window.location.href;
	var splited = url.split('?');
	var splited2 = splited[0].split('/');
	return splited2[splited2.length - 1];
}

function sendPing(s){
	s.emit('hi',{});
}

var msgObj=document.getElementById("message");
//utf-8转换为中文，解决昵称中有中文，防止出现乱码
var username = escape(getQueryString("username"));
username = username.replace(/%26/g,'&');
username = username.replace(/%3F/g,'?');
username = username.replace(/%3D/g,'=');
username=decodeURI(username);

var roomID = getroomID();

var userid=getQueryString("userid");

var headimgurl=getQueryString("headimgurl");
if(typeof(headimgurl) == 'undefined' || headimgurl == ''){
	headimgurl = "/assets/app/img/head.jpg";
}

//连接websocket后端服务器
var socket = io.connect('ws://haishen-comments.daoapp.io/haishen');
//var socket = io.connect('ws://192.168.0.102:3000/haishen');

socket.on('connect',function(){
	socket.emit('join',  {userid:userid, username:username,roomID:roomID});
	setInterval('sendPing(socket)',60000);
});

socket.on('disconnect',function(){
	socket.socket.reconnect();
});

//告诉服务器端有用户加入房间
//socket.emit('join',  {userid:userid, username:username,roomID:roomID});

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
	var contentDiv = '<small style="font-size:130%">'+obj.content+'</small>';
	var timeDiv = '<small style="font-size:130%">'+obj.times+'</small>';
	var usernameDiv = '<p style="font-size:130%">'+obj.username+'</p>';

	var section = document.createElement('li');
	section.id = obj.commentid;
	section.innerHTML = "<div><img src ="+ obj.headimgurl+" style='height:50px;margin-top: 25px;margin-left: 25px;border-radius: 50%;' alt=''/></div><div class='justify-content'>"+usernameDiv + timeDiv + contentDiv+"</div>";
	msgObj.insertBefore(section,msgObj.childNodes[1]);
});

//提交聊天消息内容
function submit_msg(){
	var content = document.getElementById("content").value;
	if(content != ''){
		var obj = {
			userid: userid,
			username: username,
			content: content,
			headimgurl:headimgurl
		};
		socket.emit('message', obj);
		document.getElementById("content").value = '';
	}
	return false;
}


//更新系统消息，本例中在用户加入、退出的时候调用
function updateSysMsg(o, action){
	//当前总的在线用户列表
	//var onlineUsers = o.onlineUsers;
	//当前总的在线人数
	//var onlineCount = o.onlineCount;
	//新加入用户的信息
	var user = o.user;

	var roomCount = o.roomCount + 100;//增加100基数

	document.getElementById("onlinecount").innerHTML = '当前共有 '+roomCount+' 人在线';

	//如果是新加入的用户，显示最近几条信息
	if(user.username == username){
		msgObj.innerHTML="";
		var section = document.createElement('li');
		section.innerHTML = '<div class="justify-content"><p style="font-size:130%">Welcome</p><small style="font-size:130%">欢迎您参与评论。</small></div>';
		msgObj.appendChild(section);
		for(var i= 0;i<o.room.length;i++){
			var headimgurlDiv = "<div><img src ="+ o.room[i].headimgurl +" style='height:50px;margin-top: 25px;margin-left: 25px;border-radius: 50%;' alt=''/></div>";
			var contentDiv = '<small style="font-size:130%">'+o.room[i].comment+'</small>';
			var usernameDiv = '<p  style="font-size:130%">'+o.room[i].username+'</p>';
			var timeDiv = '<small style="font-size:130%">'+o.room[i].times+'</small>';

			section = document.createElement('li');
			section.id = o.room[i].commentid;
			section.innerHTML = headimgurlDiv+"<div class='justify-content'>"+usernameDiv + timeDiv + contentDiv+"</div>";
			msgObj.appendChild(section);
		}
	}
}


//通过“回车”提交信息
document.getElementById("content").onkeydown = function(e) {
	e = e || event;
	if (e.keyCode === 13) {
		submit_msg();
	}
}

