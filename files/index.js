const express = require("express");
const app = express();
const { exec, execSync } = require('child_process');
const port = process.env.SERVER_PORT || process.env.PORT || 3000;        
const UUID = process.env.UUID || '986e0d08-b275-4dd3-9e75-f3094b36fa2a'; //若需要改UUID，需要在config.json里改为一致
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || 'astronodes.302046.xyz';     // 建议使用token，argo端口8080，cf后台设置需对应,使用json需上传json和yml文件至files目录
const ARGO_AUTH = process.env.ARGO_AUTH || 'eyJhIjoiMWQzOGFjODVkM2NjNDY4ZGQ5YjQxM2VhZmNlZjQxOTIiLCJ0IjoiYTllYzRjMGEtOWEwYi00Zjg2LWIxMmItMzFiOWNkNDRlZmZmIiwicyI6Ik5tUXlZV1UzTVdFdFkyWXpZeTAwWWpreExUZzBNR0V0WXpOaU9XSXpaalZrTTJNeSJ9';
const CFIP = process.env.CFIP || 'www.visa.com.tw';
const NAME = process.env.NAME || 'Choreo';

// root route
app.get("/", function(req, res) {
  res.send("Hello world!");
});

const metaInfo = execSync(
  'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
  { encoding: 'utf-8' }
);
const ISP = metaInfo.trim();

// sub subscription
app.get('/sub', (req, res) => {
  const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: '8443', id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: ARGO_DOMAIN, path: '/vmess?ed=2048', tls: 'tls', sni: ARGO_DOMAIN, alpn: '' };
  const vlessURL = `vless://${UUID}@${CFIP}:8443?encryption=none&security=tls&sni=${ARGO_DOMAIN}&type=ws&host=${ARGO_DOMAIN}&path=%2Fvless?ed=2048#${NAME}-${ISP}`;
  const vmessURL = `vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
  const trojanURL = `trojan://${UUID}@${CFIP}:8443?security=tls&sni=${ARGO_DOMAIN}&type=ws&host=${ARGO_DOMAIN}&path=%2Ftrojan?ed=2048#${NAME}-${ISP}`;
  
  const base64Content = Buffer.from(`${vlessURL}\n\n${vmessURL}\n\n${trojanURL}`).toString('base64');

  res.type('text/plain; charset=utf-8').send(base64Content);
});

// 定义 /runWeb 路由
app.get('/reRunWeb', function (req, res) {
  reRunWeb((error, message) => {
    if (error) {
      // 如果出错，返回 500 状态码和错误信息
      res.status(500).json({ error: error.message });
    } else {
      // 如果成功，返回 200 状态码和成功信息
      res.status(200).json({ message });
    }
  });
});

// 定义 /reRunServer 路由
app.get('/reRunServer', function (req, res) {
  reRunServer((error, message) => {
    if (error) {
      // 如果出错，返回 500 状态码和错误信息
      res.status(500).json({ error: error.message });
    } else {
      // 如果成功，返回 200 状态码和成功信息
      res.status(200).json({ message });
    }
  });
});

runWeb();

// run-web
function runWeb() {
  const command1 = `nohup ./web -c ./config.json >/dev/null 2>&1 &`;
  exec(command1, (error) => {
    if (error) {
      console.error(`web running error: ${error}`);
    } else {
      console.log('web is running');

      setTimeout(() => {
        runServer();
      }, 2000);
    }
  });
}
// 实现 reRunWeb 函数
function reRunWeb(callback) {
  // 检查进程是否存在
  const checkCommand = `pgrep -f "./web -c ./config.json"`;
  exec(checkCommand, (error, stdout) => {
    if (stdout.trim()) {
      // 如果进程已存在
      console.log('web is already running');
      callback(null, 'web is already running');
    } else {
      // 如果进程不存在，启动进程
      const startCommand = `nohup ./web -c ./config.json >/dev/null 2>&1 &`;
      exec(startCommand, (error) => {
        if (error) {
          console.error(`web running error: ${error}`);
          callback(error, null); // 将错误返回给客户端
        } else {
          console.log('web is running');
          callback(null, 'web is running'); // 将成功信息返回给客户端
        }
      });
    }
  });
}

// run-server
function runServer() {
  let command2 = `nohup ./server tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &`;
  exec(command2, (error) => {
    if (error) {
      console.error(`server running error: ${error}`);
    } else {
      console.log('server is running');
    }
  });
}

// 实现 reRunServer 函数
function reRunServer(callback) {
  // 检查 server 进程是否存在
  const checkCommand = `pgrep -f "server tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}"`;
  exec(checkCommand, (error, stdout) => {
    if (stdout.trim()) {
      // 如果进程已存在
      console.log('server is already running');
      callback(null, 'server is already running');
    } else {
      // 如果进程不存在，启动 server
      const startCommand = `nohup ./server tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &`;
      exec(startCommand, (error) => {
        if (error) {
          console.error(`server running error: ${error}`);
          callback(error, null); // 将错误返回给客户端
        } else {
          console.log('server is running');
          callback(null, 'server is running'); // 将成功信息返回给客户端
        }
      });
    }
  });
}

app.listen(port, () => console.log(`App is listening on port ${port}!`));
