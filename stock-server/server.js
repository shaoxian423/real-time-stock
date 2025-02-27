const WebSocket = require('ws');
const yahooFinance = require('yahoo-finance2').default;

const wss = new WebSocket.Server({ port: 8080 });
let clients = new Map();

wss.on('connection', (ws) => {
    console.log("✅ 新用户连接");

    ws.on('message', async (message) => {
        const data = JSON.parse(message);

        // 订阅实时股票数据
        if (data.action === "subscribe" && data.stocks.length > 0) {
            clients.set(ws, data.stocks);
            console.log(`📡 用户订阅股票: ${data.stocks}`);
        }

        // 处理 K 线数据请求
        if (data.action === "candlestick" && data.symbol) {
            console.log(`📊 用户请求 ${data.symbol} 的 K 线数据`);
            const candlestickData = await getCandlestickData(data.symbol, data.range || "1mo");

            if (candlestickData) {
                ws.send(JSON.stringify({ type: "candlestick", symbol: data.symbol, data: candlestickData }));
            }
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log("❌ 用户断开连接");
    });
});

// 获取实时股票价格
async function getStockPrice(symbol) {
    try {
        const quote = await yahooFinance.quote(symbol);
        return quote.regularMarketPrice;
    } catch (error) {
        console.error(`❌ 获取 ${symbol} 股票数据失败`, error);
        return null;
    }
}

// 获取 K 线数据
async function getCandlestickData(symbol, range = "1mo") {
    try {
        const endDate = new Date();
        const startDate = new Date();
        
        if (range === "1d") startDate.setDate(endDate.getDate() - 1);
        else if (range === "5d") startDate.setDate(endDate.getDate() - 5);
        else if (range === "1mo") startDate.setMonth(endDate.getMonth() - 1);
        else if (range === "3mo") startDate.setMonth(endDate.getMonth() - 3);
        else if (range === "6mo") startDate.setMonth(endDate.getMonth() - 6);
        else if (range === "1y") startDate.setFullYear(endDate.getFullYear() - 1);
        else throw new Error(`❌ 无效的 range 参数: ${range}`);

        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = Math.floor(endDate.getTime() / 1000);

        console.log(`📊 获取 ${symbol} 的 K 线数据，时间范围: ${new Date(period1 * 1000)} - ${new Date(period2 * 1000)}`);

        const historicalData = await yahooFinance.chart(symbol, {
            period1: period1,
            period2: period2,
            interval: "1d"
        });

        console.log(`📡 Yahoo API 响应数据 (${symbol}):`, JSON.stringify(historicalData, null, 2));

        if (!historicalData || !historicalData.quotes || historicalData.quotes.length === 0) {
            throw new Error(`❌ 无法获取 ${symbol} 的 K 线数据`);
        }

        let klineData = historicalData.quotes.map(quote => ({
            timestamp: new Date(quote.date).getTime(),
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            volume: quote.volume
        }));

        return klineData;
    } catch (error) {
        console.error(`❌ 获取 ${symbol} K 线数据失败`, error);
        return null;
    }
}

// 每 2 秒推送实时股票数据
setInterval(async () => {
    try {
        const stocks = [...new Set([...clients.values()].flat())];
        let stockData = {};

        for (let symbol of stocks) {
            stockData[symbol] = await getStockPrice(symbol);
        }

        wss.clients.forEach((client) => {
            if (clients.has(client)) {
                let updates = {};
                clients.get(client).forEach(symbol => {
                    updates[symbol] = stockData[symbol];
                });
                client.send(JSON.stringify({ type: "realtime", data: updates }));
            }
        });

    } catch (error) {
        console.error("❌ 获取股票数据失败", error);
    }
}, 2000);