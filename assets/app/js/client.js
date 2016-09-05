function getQueryString(name){
	var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
	var r = window.location.search.substr(1).match(reg);
	if (r != null) return unescape(r[2]); return null;
}

var msgObj=document.getElementById("message");
//utf-8转换为中文，解决昵称中有中文，防止出现乱码
var username = escape(getQueryString("username"));
username = username.replace(/%26/g,'&');
username = username.replace(/%3F/g,'?');
username = username.replace(/%3D/g,'=');
username=decodeURI(username);

var userid=getQueryString("userid");

//连接websocket后端服务器
var socket = io.connect('ws://haishen-comments.daoapp.io/haishen');
//var socket= io.connect('ws://192.168.3.10:3000/haishen');
//var socket= io.connect('ws://4k.evideocloud.com/haishen');

//告诉服务器端有用户加入房间
socket.emit('join',  {userid:userid, username:username});

//监听新用户登录
socket.on('join', function(o){
	updateSysMsg(o, 'join');
});

//监听新用户登录
socket.on('leave', function(o){
	updateSysMsg(o, 'leave');
});

//监听消息发送
socket.on('message', function(obj){
	var contentDiv = '<small style="font-size:130%">'+obj.content+'</small>';
	var timeDiv = '<small style="font-size:130%">'+obj.times+'</small>';
	var usernameDiv = '<p style="font-size:130%">'+obj.username+'</p>';

	var section = document.createElement('li');
	section.innerHTML = "<div class='justify-content'>"+usernameDiv + timeDiv + contentDiv+"</div>";
	msgObj.insertBefore(section,msgObj.childNodes[2]);
});

//提交聊天消息内容
function submit_msg(){
	var content = document.getElementById("content").value;
	if(content != ''){
		var obj = {
			userid: userid,
			username: username,
			content: content
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

	var roomCount = o.roomCount;

	document.getElementById("onlinecount").innerHTML = '当前共有 '+roomCount+' 人在线';

	//如果是新加入的用户，显示最近几条信息
	if(user.username == username){
		for(var i= 0;i<o.room.length;i++){
			var contentDiv = '<small style="font-size:130%">'+o.room[i].comment+'</small>';
			var usernameDiv = '<p  style="font-size:130%">'+o.room[i].username+'</p>';
			var timeDiv = '<small style="font-size:130%">'+o.room[i].times+'</small>';

			var section = document.createElement('li');
			section.innerHTML = "<div class='justify-content'>"+usernameDiv + timeDiv + contentDiv+"</div>";
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

