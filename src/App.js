import React from "react";
import { Route, Routes } from "react-router-dom";
import { ConfigProvider } from "antd";
import zh from "antd/lib/locale/zh_CN";
import Home from "./Home";
import Editor from "./Editor";
import "antd/dist/antd.css";
import "./style.css";

export default function App() {
  return (
    <div className="App">
      <ConfigProvider locale={zh}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path=":id" element={<Editor />} />
        </Routes>
      </ConfigProvider>
    </div>
  );
}
