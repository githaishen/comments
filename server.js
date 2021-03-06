﻿const express = require('express');
var app = express();
var http = require('http').Server(app);
//var ios = require('socket.io')(http,{
//    "transports":['polling']
//});
var ios = require('socket.io')(http);
var io = ios.of('/haishen');
var request = require('request');
const fs = require("fs");
const path = require('path');
var router = express.Router();
var xss = require('xss');
var moment = require('moment');
var bodyParser = require('body-parser');
var zlib = require("zlib");

app.use('/assets', express.static('./assets/'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(bodyParser.urlencoded({ extended: false }));

////解析json格式的body，否则POST json 数据时 body为空
//app.use(bodyParser.json());

var roomtxt = fs.readFileSync("./room.txt", 'utf8');
roomtxt = roomtxt.replace(/\r/g,'');
var rooms = roomtxt.split("\n");

// 房间用户名单
var roomInfo = {};

//总的在线用户
var onlineUsers = {};
//总的在线人数
var onlineCount = 0;

io.on('connection', function(socket){
    var roomID = '';

    socket.on('join', function (obj) {

        socket.name = obj.userid;

        roomID = obj.roomID;

        if (rooms.indexOf(roomID) != -1) {

            //检查在线列表，如果不在里面就加入
            if(!onlineUsers.hasOwnProperty(obj.userid)) {
                onlineUsers[obj.userid] = obj.username;
                //在线人数+1
                onlineCount++;
            }

            // 将用户昵称加入房间名单中
            if (!roomInfo[roomID]) {
                roomInfo[roomID] = [];
            }
            roomInfo[roomID].push(obj.userid);

            socket.join(roomID);    // 加入房间

            //设置显示条数（最新的），具体做法：读取数据、分割为数据、删除前linenum-displaynum条、倒排序让最新的放到最前面
            var display_num = 300;

            var txt = fs.readFileSync( './room/'+roomID+'.txt', 'utf8');
            var lines = txt.split("\n");
            lines.pop();
            var linenum = lines.length;
            if (linenum > display_num) {
                lines.splice(0, linenum - display_num);
            }
            lines.reverse();

            //安全起见，获取的评论记录中删除userid信息后，再将commentid，username，comments和tims发送给前台
            for (var i = 0; i < lines.length; i++) {
                var items = lines[i].split(',');
                items.shift();//删除第一个元素userid
                items[0] = '{' + items[0];//加上左括号
                lines[i] = items.join(',');
            }
            txt = lines.join('\n');

            var json = JSON.parse('{"room": ['+txt.substr(0,txt.length-1)+']}');
            //console.log(roomInfo[roomID]);
            //var msg = Object.assign({onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj, roomCount:roomInfo[roomID].length},json);

            var msg = Object.assign({user:obj, roomCount:roomInfo[roomID].length},json);

            //向房间所有客户端广播用户加入
            //io.emit('login', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
            io.to(roomID).emit('join', msg);

            // 后台日志显示
            console.log(obj.username + '加入了' + roomID+"房间");
        }
        //可根据情况处理聊天室不存在的错误，此处不做任何处理
    });

    socket.on('leave', function () {
        socket.emit('disconnect');
    });

    socket.on('hi', function () {

    });

    //监听用户退出
    socket.on('disconnect', function(){
        //将退出的用户从在线列表中删除
        if(onlineUsers.hasOwnProperty(socket.name)) {
            //退出用户的信息
            var obj = {userid:socket.name, username:onlineUsers[socket.name]};

            //删除
            delete onlineUsers[socket.name];
            //在线人数-1
            onlineCount--;

            var index = roomInfo[roomID].indexOf(socket.name);
            if (index !== -1) {
                roomInfo[roomID].splice(index, 1);
            }

            //向房间内所有客户端广播用户退出
            //io.to(roomID).emit('leave', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj,roomCount:roomInfo[roomID].length});
            io.to(roomID).emit('leave', {user:obj,roomCount:roomInfo[roomID].length});
            socket.leave(roomID);//退出房间

            //后台日志显示
            console.log(obj.username+'退出了'+roomID+'房间');
        }
    });


    //监听用户发布聊天内容
    socket.on('message', function(obj){
        if (rooms.indexOf(roomID) != -1) {
            //moment.locale('zh-cn');
            //var curTime = moment().format('YYYY-MM-DD HH:mm:ss');//操作系统如果设置了北京时间，采用这种获取时间方法
            var curTime = moment().add(8,'h').format('YYYY-MM-DD HH:mm:ss');//目前daocloud主机时间是格林威治时间，北京在东8区，增加8小时
            var commentid = genUid();

            //向所有客户端广播发布的消息,加入当前时间
            io.to(roomID).emit('message', {userid:obj.userid, username:obj.username,commentid:commentid,content:obj.content,times:curTime,headimgurl:obj.headimgurl});

            //防止xss攻击，去掉HTML标签
            var  filterHtml= xss(obj.content, {
                whiteList:          [],        // 白名单为空，表示过滤所有标签
                stripIgnoreTag:     true,      // 过滤所有非白名单标签的HTML
                stripIgnoreTagBody: ['script'] // script标签较特殊，需要过滤标签中间的内容
            });

            //替换双引号（系统日志文件总以双引号分割）
            var REGEXP_QUOTE = /"/g;
            var filterMsg = filterHtml.replace(REGEXP_QUOTE,'&quot;');
            fs.appendFileSync( './room/'+roomID+'.txt','{"userid":"'+obj.userid+'","username":"'+obj.username+'","commentid":"'+commentid+'","comment":"'+filterMsg+'","headimgurl":"'+obj.headimgurl+'","times":"'+curTime+'"},\n');

            //后台日志显示
            console.log(obj.username+'说：'+filterMsg);
        }
    });
});

// room page
router.get('/haishen/room/:roomID?', function (req, res) {
    var username = req.query.username;
    var userid = req.query.userid;
    var roomID = req.params.roomID;
    if(roomID == 'undefined'){//某些时候回出现，可能和浏览器缓存有关
        return;
    }

    if(typeof(username) == 'undefined' || typeof(userid) == 'undefined'){
        res.send("网页网址访问错误！");
        console.log("room网页网址访问错误！");
        return;
    }

    var poster = "/assets/app/img/"+roomID+"_poster.jpg";

    var json=JSON.parse(fs.readFileSync('./list.json'));

    //解析json文件内容，找到roomID对应的视频url
    var vurl = '';
    for(var i in json.video){
        if(json.video[i].room == roomID){
            vurl = json.video[i].url;
        }
    }

     //渲染页面数据(见views/room.hbs)
    res.render("room", {
        vurl:vurl,
        poster:poster
    });
});

// wall page
router.get('/haishen/wall', function (req, res) {

    // 渲染页面数据(见views/room.hbs)
    res.render("wall");
});

router.get('/haishen/lyzk', function (req, res) {

    // 渲染页面数据(见views/lyzk.hbs)下载良医智库
    res.render("lyzk");
});



router.get('/haishen/list', function (req, res) {
    var username = req.query.username;
    var userid = req.query.userid;
    var headimgurl = req.query.headimgurl;

    if(typeof(username) == 'undefined' || typeof(userid) == 'undefined'){
        res.send("网页网址访问错误！");
        console.log("list网页网址访问错误！");
        return;
    }

    if(typeof(headimgurl) == "undefined") {
        headimgurl = '';
    }

    // 渲染页面数据(见views/list.hbs)
    res.render('list', {
        username:username,
        userid:userid,
        headimgurl:headimgurl
    });
});


router.get('/haishen/video', function (req, res) {

    var username = req.query.username;
    var userid = req.query.userid;
    var expertid = req.query.expertid;
    var headimgurl = req.query.headimgurl;

    if(username == 'undefined' || typeof(userid) == 'undefined'){
        res.send("网页网址访问错误！");
        console.log("video网页网址访问错误！");
    }else{
        username = replaceURIChar(username);
        if(typeof(headimgurl) == "undefined") {
            headimgurl = '';
        }
        var json=JSON.parse(fs.readFileSync('./list.json'));

        var list = new Array();
        for(var i in json.video){
            if(json.video[i].expertid == expertid){
                var room = json.video[i].room;
                var url = "/haishen/room/"+room+"?username="+username+"&userid="+userid+"&headimgurl="+headimgurl;
                var pic = "/assets/app/img/"+room+".jpg";
                list.push({url:url,title:json.video[i].title,pic:pic});
            }
        }

        // 渲染页面数据(见views/video.hbs)
        res.render('video', {
            list:list
        });
    }
});


						router.get('/haishen/live', function (req, res) {
							var username = req.query.username;
							var userid = req.query.userid;
							var headimgurl = req.query.headimgurl;
						
							if(typeof(username) == 'undefined' || typeof(userid) == 'undefined'){
								res.send("网页网址访问错误！");
								console.log("list网页网址访问错误！");
								return;
							}
						
							if(typeof(headimgurl) == "undefined") {
								headimgurl = '';
							}
						
							// 渲染页面数据(见views/live.hbs)
							res.render('live', {
								username:username,
								userid:userid,
								headimgurl:headimgurl
							});
						});

						

//获取某个房间的评论数据，以json格式返回
//调用方法http://XXX:3000/getComments/room001?num=10
//room001为房间号
//num为返回的评论数，如果不写num，全部返回
router.get('/haishen/getComments/:roomID?', function (req, res) {
    var roomID = req.params.roomID;
    var num = req.query.num;
    var path = './room/'+roomID+'.txt';
    if (fs.existsSync(path)) {
        var txt = fs.readFileSync(path, 'utf8');
        var lines = txt.split("\n");
        lines.pop();

        if (num > 0) {
            var linenum = lines.length;
            if (linenum > num) {
                lines.splice(0, linenum - num);
            }
        }

        //最新的评论放在最前面
        lines.reverse();

        txt = lines.join('\n');
        var json = JSON.parse('{"' + roomID + '": [' + txt.substr(0, txt.length - 1) + ']}');
        res.json(json);
    }else{
        res.send("评论数据不存在，清检查URL中房间号是否正确！");
    }
});

//获取某个房间的评论数据，以原文件格式返回
router.get('/haishen/getCommentsFile/:roomID?', function (req, res) {
    var roomID = req.params.roomID;
    var path = './room/'+roomID+'.txt';
    if (fs.existsSync(path)) {
        var raw = fs.createReadStream(path, {flags: "r", encoding: "utf8"});
        raw.on("error", function (err) {
            throw err;
        });
        res.writeHead(200, "Ok", {
            'Content-Encoding': 'gzip',
            'Content-Type': 'text/plain;charset=utf-8',
            'Content-Disposition': 'attachment'
        });
        raw.pipe(zlib.createGzip()).pipe(res);
    }else{
        res.send("评论数据不存在,请检查URL中房间号是否正确！");
    }
});

//显示index页面，目前是让用户输入昵称或选择跳过，系统自动分配游客名称给用户
//用于未经过微信认证的场合
router.get('/haishen/nickname', function (req, res) {
    var state = req.query.state;
    if(!state){
        state = 2;//缺省“专家讲堂”
    }
    res.render("index",{
        state:state
    });
});

//微信认证，用于获取微信用户openid作为userid,nickname作为username
//调用方式：
//      直播：https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx0c6c76f0c511299&redirect_uri=http://haishen-comments.daoapp.io/haishen/wx&response_type=code&scope=snsapi_userinfo&state=1#wechat_redirect
//      专家讲堂：https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx0c6c76f0c511299&redirect_uri=http://haishen-comments.daoapp.io/haishen/wx&response_type=code&scope=snsapi_userinfo&state=2#wechat_redirect
//其中appid在微信公众号平台获取，本公众号的appid为wx0c6c76f0c5112993
//    redirect_uri=http://haishen-comments.daoapp.io/haishen/wx为系统认证跳转网址，即指向本router
//目前是在微信“专家讲堂”菜单中调用，调用后返回code，用于进一步获取openid和access_token
router.get('/haishen/wx', function (req, res) {
    var code = req.query.code;
    var state = req.query.state;//用于区分“直播”和“专家讲堂”，state=1为直播，state=2为专家讲堂
    var access_token = '';
    var openid = '';
    var nickname = '';

    //通过code获取用户openid和access_token
    request('https://api.weixin.qq.com/sns/oauth2/access_token?appid=wx0c6c76f0c5112993&secret=9ad514cf86d03a95938ca4fe16dec868&code='+code+'&grant_type=authorization_code',function(error,response,body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            access_token = data.access_token;
            openid = data.openid;

            //获取微信用户信息，如昵称、logo地址等
            renderList(access_token,openid,res,state);
        } else {
            //如果出错，让用户自行输入昵称
            res.render("index",{
                state:state
            });
        }
    });

});

//测试昵称中有特殊字符情况
//router.get('/haishen/test',function(req,res){
//    var nickname = "ab&cd ef+gh/ij?kl%3Fmn&op=qr";
//    nickname = replaceURIChar(nickname);
//    res.render('list', {
//        username:nickname,
//        userid:'1111'
//    });
//});

//router.get('/haishen/test',function(req,res){
//    var userid = genUid();
//    var username = "游客"+userid;
//    res.redirect("/haishen/room/testroom?userid="+userid+"&username="+username);
//});


router.get('/haishen/admin', function (req, res) {
    res.render("admin");
});

router.post('/haishen/auth', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    if(username == 'admin' & password == 'honor123'){
        res.render("admin_delComments");
    }else{
        res.send('账号密码输入错误！');
    }
});

router.post('/haishen/delComments', function (req, res) {
    var roomID = req.body.roomID;
    var commentID = req.body.commentID;
    var success = delComments(roomID,commentID);
    if( success == 1){
        //给客户端发消息，删除界面上的评论内容
        io.to(roomID).emit("del",{commentid:commentID});
        res.send("评论删除成功！");
    }else if(success == 2){
        res.send("房间号不存在，评论删除失败！")
    }else{
        res.send("评论号不存在，评论删除失败！");
    }

});

//调用微信接口，获取用户昵称等信息
//由于nodejs为异步模式，因此考虑到微信获取用户信息接口，需要先获取openid和access_token，再获取用户信息，要采用同步模式，因此单独写一个函数供调用
function renderList(access_token,openid,res,state){
    request.get('https://api.weixin.qq.com/sns/userinfo?access_token='+access_token+'&openid='+openid,function(error,response,body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            var nickname = data.nickname;
            var headimgurl = data.headimgurl;
            if(typeof(data.nickname) == "undefined") {
                nickname = "游客"+genUid();
                headimgurl = '';
            }
            nickname = replaceURIChar(nickname);
            if(nickname == ''){
                res.send("您的昵称信息访问出错！");
                console.log("用户昵称信息访问出错！");
            }else{
                if(state == 2) {//专家讲堂
                    res.render('list', {
                        username: nickname,
                        userid: openid,
                        headimgurl:headimgurl
                    });
					

			
				
			
                }else{//直播
				
					if(state == 1) {
                    res.redirect("/haishen/live?userid="+openid+"&username="+nickname+"&headimgurl="+headimgurl);
					}else{//手机拍摄
						if(state == 3) {//肌电图教学系列
                    	res.redirect("/haishen/video?userid="+openid+"&username="+nickname+"&expertid=666&headimgurl="+headimgurl);
						}
					}
					
                }
            }
        } else {
            //如果出错，让用户自行输入昵称
            res.render("index",{
                state:state
            });
        }
    });
}

//生成随机数，用于生成游客uiserid和名称
function genUid(){
    return new Date().getTime()+""+Math.floor(Math.random()*899+100);
}

function replaceURIChar(str){
    //替换到nickname中的http参数保留字符，包括%,+,空格,/,?,#,&,=
    if(typeof(str) == 'undefined'){
        return "";
    }
    str = str.replace(/\%/g,'%25');
    str = str.replace(/\+/g,'%2B');
    str = str.replace(/\ /g,'%20');
    str = str.replace(/\//g,'%2F');
    str = str.replace(/\?/g,'%3F');
    str = str.replace(/\#/g,'%23');
    str = str.replace(/\&/g,'%26');
    str = str.replace(/\=/g,'%3D');
    return str;
}


//删除某个房间的某条评论数据
//调用方法http://XXX:3000/delComments/room001?id=xxxx&
//room001为房间号
//id为拟删除的评论编号
function delComments(roomID,commentID){
    var success = 0;
    var id = '"'+commentID+'"';
    var path ='./room/'+roomID+'.txt';
    if (fs.existsSync(path)) {
        var data = fs.readFileSync(path, 'utf8');
        var lines = data.split("\n");
        var len = lines.length -1;
        for (var i = 0; i < len ; i++) {
            var items = lines[i].split(',');
            var item_id = items[2].split(":");
            if (item_id[1] == id) {
                lines.splice(i, 1);
                success = 1;
                fs.writeFileSync(path, lines.join('\n'), 'utf8');
                break;
            }
        }
    }else{
        success = 2;
    }
    return success;
}

app.use('/', router);

http.on("error", function(error) {
    console.log(error);
});

//监听浏览器3000端口访问
http.listen(3000, function(){
    console.log('listening on *:3000');
});