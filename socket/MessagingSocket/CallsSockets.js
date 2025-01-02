const express = require("express");
const http = require("http");
const morgan = require("morgan");
const socketio = require("socket.io");
const app = express();
const { ExpressPeerServer } = require("peer");
const server = http.createServer(app);

app.use(express.json());
const customGenerationFunction = () => {
  (Math.random().toString(36) + "00000000000").substr(2, 6);
};

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/",
  generateClientId: customGenerationFunction,
});

app.use("/mypeer", peerServer);

io.on("connection", function (socket) {
  console.group("connected");
});

const port = process.env.PORT || 5000
server.listen(port, ()=>console.log(`Server running cas`))

