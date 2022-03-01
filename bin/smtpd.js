#!/usr/bin/env node

import http from "http";
import {join} from "path";
import {SMTPServer} from "smtp-server";
import {Database} from "@zingle/sqlite";
import {Storage} from "@zingle/smtpd";
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
    const {dir} = config;
    const storage = await createStorage(config);
    const httpServer = createHTTPServer({...config.http, storage, dir});
    const smtpServer = createSMTPServer({...config.smtp, storage, dir});

    httpServer.listen();
    smtpServer.listen();

    return true;
  } catch (err) {
    console.error(process.env.DEBUG ? err : err.message);
    return false;
  }
}

function createHTTPServer({user, pass, port, storage}) {
  const listener = requestListener({user, pass, storage});
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

function createSMTPServer({dir, storage, port, ...smtp}) {
  smtp.secure = false;   // security upgraded after connect
  smtp.disabledCommands = ["AUTH"];
  smtp.onData = dataListener({dir, storage});
  smtp.onRcptTo = receiptListener({storage});

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

async function createStorage({dir}) {
  const filename = join(dir, "smtpd.db");
  const db = new Database(filename);
  await Storage.initialize(db);
  return new Storage(db);
}
