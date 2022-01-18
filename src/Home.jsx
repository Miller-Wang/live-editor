import React, { useEffect, useState, useRef } from "react";
import { Card, Button, Modal, Form, Input, message } from "antd";
import { useNavigate } from "react-router-dom";
import "./home.style.css";
import roomImg from "./imgs/rooms.jpeg";

const Server = "http://localhost:4000";

export default function Home(props) {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();
  const [visible, setModalVisible] = useState(false);
  const [isEnter, setEnter] = useState(false);
  const [enterRoom, setEnterRoom] = useState();
  const formRef = useRef(null);
  const [user] = useState(
    localStorage.getItem("USER")
      ? JSON.parse(localStorage.getItem("USER"))
      : { id: Math.random() }
  );

  const getRooms = async () => {
    const { data } = await fetch(`${Server}/rooms`).then((res) => res.json());
    Object.entries(data).forEach(([k, val]) => {
      val.name = k;
    });
    setRooms(Object.values(data));
  };

  useEffect(() => {
    getRooms();
  }, []);

  const handleOk = async () => {
    try {
      const values = await formRef.current.validateFields();

      if (isEnter) {
        navigate(
          `/${enterRoom.name}?username=${values.username}&id=${user.id}`
        );
        return;
      }

      // 进入房间
      fetch(`${Server}/enterRoom?id=${values.roomId}&name=${values.name}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.code === 0) {
            message.success("创建成功");
            getRooms();
            setModalVisible(false);
          } else {
            message.error(res.message);
          }
        });
    } catch (error) {
      console.info(error);
    }
  };

  return (
    <div>
      <h2>多人在线文档编辑</h2>
      <Card
        title="房间列表"
        className="card-list"
        extra={
          <Button type="primary" onClick={() => setModalVisible(true)}>
            创建房间
          </Button>
        }
      >
        {rooms.map((room, i) => (
          <Card
            key={i}
            hoverable
            style={{ width: 240 }}
            cover={<img alt="example" src={roomImg} />}
            onClick={() => {
              setEnterRoom(room);
              setEnter(true);
              setModalVisible(true);
            }}
          >
            <Card.Meta
              title={`房间：${room.name}`}
              description={`在线人数：${Object.values(room.users).length}`}
            />
          </Card>
        ))}
      </Card>
      <Modal
        title={isEnter ? "进入房间" : "创建房间"}
        visible={visible}
        destroyOnClose
        maskClosable={false}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
      >
        <Form ref={formRef}>
          {isEnter ? (
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                label="房间名"
                name="name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="房间ID"
                name="roomId"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
