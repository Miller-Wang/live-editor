const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");

// 跨域
app.use(cors());

const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowEIO3: true,
  },
});

// 用户数据结构
// {roomId: {users: {id, color, pos}}, docValue, socketUserMap: {socketId: userId}}
const store = {};

// 房间列表 {id: room}
const rooms = {};

// 服务端分配颜色
const COLORS = [
  "#549EF9",
  "#3056FB",
  "#51BF8D",
  "#D77829",
  "#D644D3",
  "#9300D3",
  "#2968CF",
  "#52B5DA",
  "#775DDB",
  "#BE5250",
];

// 创建房间
app.get("/enterRoom", (req, res) => {
  const { query } = req;
  if (!query.id) {
    return res.json({ code: -1, message: "请指定房间号" });
  }

  if (rooms[query.id]) {
    // 房间已存在
    return res.json({ code: 0, message: "加入成功" });
  }

  const room = createRoom(query.id, query.name);
  rooms[query.id] = room;

  res.json({ code: 0, message: "创建成功" });
});

// 查询所有房间
app.get("/rooms", (req, res) => {
  res.json({ code: 0, data: store });
});

// 查询房间数据
app.get("/roomInfo", (req, res) => {
  const { query } = req;
  if (!query.id) {
    return res.json({ code: -1, message: "请指定房间号" });
  }

  if (!store[query.id]) {
    return res.json({ code: 1, message: "房间号不存在" });
  }

  res.json({ code: 0, data: store[query.id] });
});

/**
 * 创建房间
 * @param {*} id
 * @returns
 */
function createRoom(id, name) {
  const room = io.of(`/${id}`);
  // 房间内的数据
  store[id] = {
    name,
    users: {},
    docValue: "",
    socketUserMap: {}, // socketId: userId
  };

  room.on("connection", (socket) => {
    console.log("a user connected", socket.nsp.name);
    const roomId = socket.nsp.name.slice(1);
    socket.on("disconnect", () => {
      console.log("user disconnected", socket.id);
      const { users, socketUserMap } = store[roomId];
      const leaveUser = socketUserMap[socket.id];
      delete socketUserMap[socket.id];
      delete users[leaveUser];
      // 更新用户数据
      room.emit("updateUser", Object.values(users));
    });

    socket.on("message", ({ changes, docValue }) => {
      console.log("message: " + changes);
      console.log("docValue: " + docValue);
      store[roomId].docValue = docValue;

      socket.broadcast.emit("message", changes);
    });

    // 用户进入
    socket.on("enter", (user) => {
      const { users, docValue, socketUserMap } = store[roomId];
      if (!users[user.id]) {
        users[user.id] = { ...user, color: "" };
      }
      socketUserMap[socket.id] = user.id;
      room.emit("enter", { users: Object.values(users), [user.id]: docValue });
    });

    // 更新用户光标位置
    socket.on("updateUser", (user) => {
      store[roomId].users[user.id] = user;
      room.emit("updateUser", Object.values(store[roomId].users));
    });
  });
  return room;
}

server.listen(4000, () => {
  console.log("listening on *:4000");
});
