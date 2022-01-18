import { useEffect, useRef, useState } from "react";
import CodeMirror from "codemirror";
import { useParams } from "react-router-dom";
import { Card } from "antd";
import qs from "qs";
import "codemirror/lib/codemirror.css"; // 默认样式
import "./style.css";

const MESSAGE_TYPES = {
  CONNECT: "connect",
  MESSAGE: "message",
  ENTER: "enter",
  UPDATE_USER: "updateUser",
};

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

const SOCKET_SERVICE = "http://localhost:4000";

function Editor() {
  const cursorTempRef = useRef();
  const { id: roomId } = useParams();
  const [searchParams] = useState(qs.parse(window.location.search.slice(1)));

  useEffect(() => {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
      lineNumbers: true,
      mode: "javascript",
    });
    let users = [];
    const user = {
      id: searchParams.id,
      username: searchParams.username,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    let socket;
    const cursorMap = {};
    const cursorTemp = cursorTempRef.current;

    connect();
    addEditorListener();

    // 连接socket
    function connect() {
      socket = window.io(`${SOCKET_SERVICE}/${roomId}`);
      // 第一次连接成功
      socket.once(MESSAGE_TYPES.CONNECT, onceConnect);
      socket.on(MESSAGE_TYPES.MESSAGE, onMessage);
      socket.on(MESSAGE_TYPES.ENTER, onUserEnter);
      socket.on(MESSAGE_TYPES.UPDATE_USER, onUpdateUser);
    }

    // ----------------------socket消息---------------------------
    // 第一次连接成功
    function onceConnect() {
      socket.emit("enter", {
        ...user,
        pos: { line: editor.lastLine(), ch: 0 },
      });
    }

    // 收到消息
    function onMessage(msg) {
      applyServerChanges(msg);
    }

    // 用户进入
    function onUserEnter(data) {
      users = data.users;
      if (data[user.id]) {
        // 是自己进入房间的，需要同步文档内容
        editor.setValue(data[user.id]);
      }

      // 设置用户光标位置
      updateCursor();

      // 本地显示更新
      //  updateUsers(users);
    }

    // 更新用户信息
    function onUpdateUser(data) {
      const oldUsers = users;
      users = data;
      updateCursor(oldUsers.length !== data.length ? oldUsers : undefined);

      // 本地显示更新
      // this.updateUsers && this.updateUsers(this.users);
    }

    // ------------------------监听编辑器---------------------------
    function addEditorListener() {
      editor.on("change", onEditorChange);
      editor.on("cursorActivity", onCursorActivity);
      editor.on("focus", onEditorFocus);
      editor.on("blur", onEditorBlur);
    }

    // 修改编辑器内容
    function onEditorChange(instance, changes) {
      const docValue = editor.getValue();
      socket.emit(MESSAGE_TYPES.MESSAGE, {
        changes,
        docValue,
        user,
      });
    }

    // 光标移动
    function onCursorActivity() {
      const cursorPos = editor.getCursor();
      editor.addWidget(cursorPos, getCursor(user), false);
      socket.emit("updateUser", {
        ...user,
        pos: cursorPos,
      });
    }

    // 编辑器聚焦
    function onEditorFocus() {
      cursorMap[user.id] &&
        (cursorMap[user.id].children[1].style.display = "none");
    }

    // 编辑器离焦
    function onEditorBlur() {
      cursorMap[user.id] &&
        (cursorMap[user.id].children[1].style.display = "block");
    }

    // ------------------------处理编辑器事件---------------------------

    // 应用服务端的修改
    function applyServerChanges(change) {
      const { from, to, text, origin } = change;
      switch (origin) {
        case "+input":
        case "paste":
        case "*compose":
        case "complete":
          editor.replaceRange(text, from, to);
          break;
        case "+delete":
          editor.replaceRange("", from, to);
          break;
        case "undo":
          editor.undo();
          break;
        case "redo":
          editor.redo();
          break;
        default:
          break;
      }
    }

    // 显示用户的光标位置
    function getCursor(u) {
      const ele = cursorMap[u.id]
        ? cursorMap[u.id]
        : cursorTemp.cloneNode(true);
      ele.style.display = "block";
      ele.children[0].innerHTML = u.username;
      ele.children[0].style.backgroundColor = u.color;
      ele.children[1].style.color = u.color;
      if (u.id === user.id) {
        // 是自己，不显示光标
        ele.children[1].style.display = "none";
        ele.style.zIndex = 20;
      }
      cursorMap[u.id] = ele;
      return ele;
    }

    // 更新用户光标位置
    function updateCursor(oldUsers) {
      if (oldUsers) {
        // 对比新老用户列表，删除老的光标
        oldUsers.forEach((v) => {
          const findUser = users.find((u) => u.id === v.id);
          if (!findUser) {
            console.log("删除用户", v);
            cursorMap[v.id] && cursorMap[v.id].remove();
            delete cursorMap[v.id];
          }
        });
      }

      users.forEach((v) => {
        v.id !== user.id && editor.addWidget(v.pos, getCursor(v), false);
      });
    }
    return () => {
      console.log("------离开房间-----");
    };
  }, []);

  return (
    <Card
      title={
        <div>
          编辑器 &nbsp;&nbsp;&nbsp;&nbsp; 房间号：{roomId}
          {/* &nbsp;&nbsp;&nbsp;&nbsp;用户数：{users.length} */}
        </div>
      }
    >
      <textarea id="editor"></textarea>
      {/* 光标模版 */}
      <div className="cursor-view" ref={cursorTempRef}>
        <span className="user-name">用户名</span>
        <span className="cursor">|</span>
      </div>
    </Card>
  );
}

export default Editor;
