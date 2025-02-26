const WebSocket = require('ws');

const socket = new WebSocket("ws://localhost:8080");

// 连接 WebSocket 服务器并订阅 AAPL 和 TSLA
socket.onopen = () => {
    console.log("✅ 连接成功");
    socket.send(JSON.stringify({ action: "subscribe", stocks: ["AAPL", "TSLA"] }));
};

// 监听服务器推送的实时股票数据
socket.onmessage = (event) => {
    console.log("📈 收到实时股票数据:", JSON.parse(event.data));
};

// 监听 WebSocket 断开
socket.onclose = () => {
    console.log("❌ 连接断开");
};