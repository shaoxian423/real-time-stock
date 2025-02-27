const WebSocket = require('ws');
const yahooFinance = require('yahoo-finance2').default;

const wss = new WebSocket.Server({ port: 8080 });
let clients = {};

wss.on('connection', (ws) => {
    console.log("新用户连接");

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        if (data.action === "subscribe" && data.stocks.length > 0) {
            clients[ws] = data.stocks;
            console.log(`用户订阅股票: ${data.stocks}`);

            // 立即推送一次最新数据
            let stockData = {};
            for (let symbol of data.stocks) {
                stockData[symbol] = await getStockPrice(symbol);
            }
            ws.send(JSON.stringify(stockData));
        }
    });

    ws.on('close', () => {
        delete clients[ws];
        console.log("用户断开连接");
    });
});

// 获取真实股票价格
async function getStockPrice(symbol) {
    try {
        const quote = await yahooFinance.quote(symbol);
        return quote.regularMarketPrice; // 获取实时价格
    } catch (error) {
        console.error(`获取 ${symbol} 股票数据失败`, error);
        return null;
    }
}

// 每 2 秒推送真实股票数据
setInterval(async () => {
    try {
        const stocks = ["AAPL", "TSLA", "GOOGL"];
        let stockData = {};

        for (let symbol of stocks) {
            stockData[symbol] = await getStockPrice(symbol);
        }

        wss.clients.forEach((client) => {
            if (clients[client]) {
                let updates = {};
                clients[client].forEach(symbol => {
                    updates[symbol] = stockData[symbol];
                });
                client.send(JSON.stringify(updates));
            }
        });

    } catch (error) {
        console.error("获取股票数据失败", error);
    }
}, 2000);