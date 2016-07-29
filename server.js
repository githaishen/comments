const express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const fs = require("fs");
const path = require('path');
var router = express.Router();
var xss = require('xss');
var moment = require('moment');

app.use('/assets', express.static('./assets/'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


// 房间用户名单
var roomInfo = {};

//总的在线用户
var onlineUsers = {};
//总的在线人数
var onlineCount = 0;

io.on('connection', function(socket){
    var url = socket.request.headers.referer;
    var splited = url.split('?');
    var splited2 = splited[0].split('/');
    var roomID = splited2[splited2.length-1];   // 获取房间ID,类似room001

    socket.on('join', function (obj) {

        socket.name = obj.userid;

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
        var display_num = 50;
        var txt = fs.readFileSync('./room/'+roomID+'.txt', 'utf8');
        var lines = txt.split("\n");
        lines.pop();
        var linenum = lines.length;
        if(linenum > display_num){
            lines.splice(0,linenum - display_num);
        }
        lines.reverse();
        txt = lines.join('\n');
        var json = JSON.parse('{"room": ['+txt.substr(0,txt.length-1)+']}');
        //console.log(roomInfo[roomID]);
        //var msg = Object.assign({onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj, roomCount:roomInfo[roomID].length},json);

        var msg = Object.assign({user:obj, roomCount:roomInfo[roomID].length},json);

        //向房间所有客户端广播用户加入
        //io.emit('login', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
        io.to(roomID).emit('join', msg);

        // 后台日志显示
        //console.log(obj.username + '加入了' + roomID+"房间");
    });

    socket.on('leave', function () {
        socket.emit('disconnect');
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
            //console.log(obj.username+'退出了'+roomID+'房间');
        }
    });


    //监听用户发布聊天内容
    socket.on('message', function(obj){

        moment.locale('zh-cn');
        var curTime = moment().format('lll');

        //向所有客户端广播发布的消息,加入当前时间
        io.to(roomID).emit('message', {userid:obj.userid, username:obj.username,content:obj.content,times:curTime});

        //防止xss攻击，去掉HTML标签
        var  filterHtml= xss(obj.content, {
            whiteList:          [],        // 白名单为空，表示过滤所有标签
            stripIgnoreTag:     true,      // 过滤所有非白名单标签的HTML
            stripIgnoreTagBody: ['script'] // script标签较特殊，需要过滤标签中间的内容
        });

        //替换双引号（系统日志文件总以双引号分割）
        var REGEXP_QUOTE = /"/g;
        var filterMsg = filterHtml.replace(REGEXP_QUOTE,'&quot;');
        fs.appendFileSync('./room/'+roomID+'.txt','{"username":"'+obj.username+'","comment":"'+filterMsg+'","times":"'+curTime+'"},\n');
        //console.log(obj.username+'说：'+filterMsg);
    });
});

// room page
router.get('/room/:roomID?', function (req, res) {
    var username = req.query.username;
    var userid = req.query.userid;
    var roomID = req.params.roomID;
    //var json=JSON.parse(fs.readFileSync('./list.json'));
    //
    ////解析json文件内容，找到roomID对应的视频url
    //var vurl = '';
    //for(var i in json.video){
    //    if(json.video[i].room == roomID){
    //        vurl = json.video[i].url;
    //    }
    //}

    // 渲染页面数据(见views/room.hbs)
    res.render(roomID, {
        username:username,
        userid:userid
    });
});

router.get('/list', function (req, res) {

    var username = req.query.username;
    var userid = req.query.userid;

    // 渲染页面数据(见views/list.hbs)
    res.render('list', {
        username:username,
        userid:userid
    });
});

router.get('/', function (req, res) {
    res.render('index');
});

app.use('/', router);

http.listen(3000, function(){
    console.log('listening on *:3000');
});