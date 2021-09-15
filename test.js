var http = require("http");
var fs = require("fs");

// Loading the index.html file displayed to the client (browser)
var httpserver = http.createServer(function (req, res) {
    fs.readFile("./index.html", "utf-8", function (error, content) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
    });
});

// create a ws connection to the server asterisk
const WebSocket = require("ws");
const ws_client = new WebSocket("ws://localhost:8088/ari/events?api_key=asterisk:asterisk&app=hello&subscribeAll=true");

// ws_client listens to the event 'error' for getting errors
// when the server asterisk has some socket connection problems
ws_client.on("error", function error(error) {
    console.log(error);
});

// create an instance socket.io attached to http server
var io_httpserver = require("socket.io")(httpserver);

//listens all clients which connect to the socket 'mysocket',
//in this case we have only one client (sokcet.io_client_1) in index.html
io_httpserver.sockets.on("connection", function (mysocket) {
    // ws_client listens to the event 'message' for getting data of the server asterisk
    ws_client.on("message", function show(data) {
        //send data to all clients which listen to the custom event 'titi'
        mysocket.emit("titi", data.toString());
    });
});

httpserver.listen(8080);
