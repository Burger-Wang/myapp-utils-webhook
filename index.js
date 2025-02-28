const fs = require("fs");
const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");
const { exec } = require("child_process");
const dayjs = require("dayjs");
const logStream = fs.createWriteStream("webhook.log", { flags: "a" });
const logRecord = (megType, str) => {
  const time = dayjs().format("YYYY-MM-DD HH:mm:ss");
  console.log(`${time} - ${megType}: \n${str}`);
  logStream.write(`${time} - ${megType}: \n${str}\n--------------\n`);
};

const app = new Koa();
app.use(bodyParser());

const wwwRepoName = "myapp-utils-vue";
const koaRepoName = "myapp-utils-koa";
const router = new Router();

app.use(async (ctx, next) => {
  ctx.body = "hello world";
  console.log("req start");
  await next();
});

router.post("/webhook", (ctx, next) => {
  const event = ctx.headers["x-github-event"];
  const repoName = ctx.request.body.repository.name;

  // console.log(`Received event ${event} for repository ${repoName}`);
  let command = "";
  if (event === "push") {
    if (repoName === wwwRepoName) {
      command = `cd /var/myapp/www/${wwwRepoName} && git pull && npm install && npm run build ; cd /dockerstart && docker compose restart nginx`;
    } else if (repoName === koaRepoName) {
      command = `cd /var/myapp/koa/${koaRepoName} && git pull ; docker compose restart koa`;
    } else {
      ctx.status = 200;
      ctx.body = "Repository not configured";
    }

    exec(command, (err, stdout, stderr) => {
      if (err) {
        logRecord("Error", stderr);
        ctx.status = 500;
        ctx.body = "Failed to update code";
      }
      logRecord("Output", stdout);
      ctx.status = 200;
      ctx.body = "Code updated successfully";
    });
  } else {
    logRecord(
      "Event ignored",
      `Received event ${event} for repository ${repoName}`
    );
    ctx.status = 200;
    ctx.body = "Event ignored";
  }
});

app.use(router.routes());

app.listen(5000);
console.log("start Koa port:5000");
