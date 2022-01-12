import { useEffect, useRef } from "react";
import CodeMirror from "codemirror";
import qs from "qs";
import "codemirror/lib/codemirror.css"; // 默认样式

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

const SOCKET_SERVICE = "http://106.15.239.150:4000";

function App() {
  const editorRef = useRef();
  const socketRef = useRef();
  useEffect(() => {
    editorRef.current = CodeMirror.fromTextArea(
      document.getElementById("editor"),
      {
        lineNumbers: true,
        mode: "javascript",
      }
    );
  }, []);

  // 连接socket
  function connect() {
    const params = qs.parse(window.location.search.slice(1));
    var socket = window.io(`${SOCKET_SERVICE}/${params.pId}`);
    // 第一次连接成功
    socket.once(MESSAGE_TYPES.CONNECT, onceConnect);
    socket.on(MESSAGE_TYPES.MESSAGE, onMessage);
    socket.on(MESSAGE_TYPES.ENTER, onUserEnter);
    socket.on(MESSAGE_TYPES.UPDATE_USER, onUpdateUser);
    socketRef.current = socket;
  }

  // ----------------------socket消息---------------------------
  // 第一次连接成功
  function onceConnect() {
    // const { socket, user, codemirrorExp: editor } = this;
    socketRef.current.emit("enter", {
      ...user,
      pos: { line: editorRef.current.lastLine(), ch: 0 },
    });
  }

  // 收到消息
  function onMessage(msg) {
    this.applyServerChanges(msg);
  }

  // 用户进入
  function onUserEnter(data) {
    const {
      user: { id },
      codemirrorExp: editor,
    } = this;
    this.users = data.users;
    if (data[id]) {
      // 是自己进入房间的，需要同步文档内容
      editor.setValue(data[id]);
    }

    // 设置用户光标位置
    // this.updateCursor();

    // 本地显示更新
    // this.updateUsers && this.updateUsers(this.users);
  }

  // 更新用户信息
  function onUpdateUser(data) {
    const oldUsers = this.users;
    this.users = data;
    this.updateCursor(oldUsers.length !== data.length ? oldUsers : undefined);

    // 本地显示更新
    // this.updateUsers && this.updateUsers(this.users);
  }

  // ------------------------监听编辑器---------------------------
  function addEditorListener() {
    const { codemirrorExp: editor } = this;
    editor.on("change", this.onEditorChange);
    editor.on("cursorActivity", this.onCursorActivity);
    editor.on("focus", this.onEditorFocus);
    editor.on("blur", this.onEditorBlur);
  }

  // 修改编辑器内容
  function onEditorChange(instance, changes) {
    const { socket, user, codemirrorExp: editor } = this;
    const docValue = editor.getValue();
    socket.emit(MESSAGE_TYPES.MESSAGE, {
      changes,
      docValue,
      user,
    });
  }

  // 光标移动
  function onCursorActivity() {
    const { socket, user, codemirrorExp: editor } = this;
    const cursorPos = editor.getCursor();
    editor.addWidget(cursorPos, this.getCursor(user), false);
    socket.emit("updateUser", {
      ...user,
      pos: cursorPos,
    });
  }

  // 编辑器聚焦
  function onEditorFocus() {
    const { cursorMap, user } = this;
    cursorMap[user.id] &&
      (cursorMap[user.id].children[1].style.display = "none");
  }

  // 编辑器离焦
  function onEditorBlur() {
    const { cursorMap, user } = this;

    cursorMap[user.id] &&
      (cursorMap[user.id].children[1].style.display = "block");
  }

  // ------------------------处理编辑器事件---------------------------

  // 应用服务端的修改
  function applyServerChanges(change) {
    const { codemirrorExp: editor } = this;
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
      //   case "setValue":
      //       editor.setValue(text);
    }
  }

  // 显示用户的光标位置
  function getCursor(user) {
    const { cursorMap, cursorTemp } = this;
    const ele = cursorMap[user.id]
      ? cursorMap[user.id]
      : cursorTemp.cloneNode(true);
    ele.style.display = "block";
    ele.children[0].innerHTML = user.username;
    ele.children[0].style.backgroundColor = user.color;
    ele.children[1].style.color = user.color;
    if (user.id === this.user.id) {
      // 是自己，不显示光标
      ele.children[1].style.display = "none";
      ele.style.zIndex = 20;
    }
    cursorMap[user.id] = ele;
    return ele;
  }

  // 更新用户光标位置
  function updateCursor(oldUsers) {
    const { cursorMap, users, codemirrorExp: editor, user } = this;
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
      v.id !== user.id && editor.addWidget(v.pos, this.getCursor(v), false);
    });
  }

  return (
    <div className="App">
      <h2>编辑器</h2>
      <textarea id="editor"></textarea>
    </div>
  );
}

export default App;
