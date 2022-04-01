#!/usr/bin/env node

import http from "http";
import mariadb from "mariadb";
import {SMTPServer} from "smtp-server";
import {Secret} from "@zingle/secret";
import {UserDB} from "@zingle/smtpd";
import Task from "@zingle/task";
import {readConfig} from "@zingle/smtpd";
import {dataListener, receiptListener, requestListener} from "@zingle/smtpd";

if (!await start(process)) {
  console.error("failed to start server");
  process.exit(1);
}

async function start(process) {
  try {
    if (!process.env.DEBUG) console.debug = () => {};

    const config = await readConfig(process);
    const {db} = config;
    const userdb = await createUserDB({db});
    const secret = new Secret(config.secret);
    const httpServer = createHTTPServer({...config.http, userdb, secret});
    const smtpServer = createSMTPServer({...config.smtp, userdb});

    httpServer.listen();
    smtpServer.listen();

    process.on("SIGTERM", () => {
      console.info("shutting down after receiving SIGTERM");
      httpServer.close();
      smtpServer.close();
    });

    return true;
  } catch (err) {
    console.error(process.env.DEBUG ? err : err.message);
    return false;
  }
}

function createHTTPServer({userdb, port, secret}) {
  const listener = requestListener({userdb, secret});
  const server = http.createServer(listener);
  const {listen} = server;

  server.listen = function() {
    listen.call(server, port, () => {
      const {port} = server.address();
      console.info(`listening for HTTP requests on port ${port}`);
    });
  };

  return server;
}

function createSMTPServer({userdb, port, ...smtp}) {
  smtp.secure = false;   // security upgraded after connect
  smtp.disabledCommands = ["AUTH"];
  smtp.onData = dataListener({userdb});
  smtp.onRcptTo = receiptListener({userdb});

  const server = new SMTPServer(smtp);
  const {listen} = server;

  server.listen = function() {
    listen.call(server, port, () => {
      const {port} = server.server.address();
      console.info(`listening for SMTP messages on port ${port}`);
    });
  }

  return server;
}

async function createUserDB({db}) {
  const {hostname: host, username: user, password, port, pathname} = new URL(db);
  const database = pathname.slice(1);
  const multipleStatements = true;
  const cn = await mariadb.createConnection({
    host, user, password, port, database, multipleStatements
  });

  await cn.query("set session sql_mode = 'ANSI'");
  await UserDB.initialize(cn);

  return new UserDB(cn);
}
