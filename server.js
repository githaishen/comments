﻿const express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const fs = require("fs");
//const path = require('path');

const index = fs.readFileSync('./index.html', {
    encoding: 'utf-8'
});

const str = index;

app.use('/assets', express.static('./assets/'));

app.get('/', function(req, res) {
    res.status(200).send(str);
});

//在线用户
var onlineUsers = {};
//当前在线人数
var onlineCount = 0;

io.on('connection', function(socket){
    console.log('a user connected');

    //监听新用户加入
    socket.on('login', function(obj){
        //将新加入用户的唯一标识当作socket的名称，后面退出的时候会用到
        socket.name = obj.userid;

        //检查在线列表，如果不在里面就加入
        if(!onlineUsers.hasOwnProperty(obj.userid)) {
            onlineUsers[obj.userid] = obj.username;
            //在线人数+1
            onlineCount++;
        }

        //设置显示条数（最新的），具体做法：读取数据、分割为数据、删除前linenum-displaynum条、倒排序让最新的放到最前面
        var display_num = 5;
		var txt = fs.readFileSync('./room/room001.txt', 'utf8');
        var lines = txt.split("\n");
        lines.pop();
        var linenum = lines.length;
        if(linenum > display_num){
            lines.splice(0,linenum - display_num);
        }
        lines.reverse();
        txt = lines.join('\n');
        var json = JSON.parse('{"room001": ['+txt.substr(0,txt.length-1)+']}');
		var msg = Object.assign({onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj},json);

        //向所有客户端广播用户加入
        //io.emit('login', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
		io.emit('login', msg);
        console.log(obj.username+'加入了聊天室');
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

            //向所有客户端广播用户退出
            io.emit('logout', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
            console.log(obj.username+'退出了聊天室');
        }
    });

    //监听用户发布聊天内容
    socket.on('message', function(obj){
        //向所有客户端广播发布的消息
        io.emit('message', obj);
        fs.appendFileSync('./room/room001.txt','{"username":"'+obj.username+'","comment":"'+obj.content+'"},\n');
        console.log(obj.username+'说：'+obj.content);
    });

});

http.listen(3000, function(){
    console.log('listening on *:3000');
});