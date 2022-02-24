#!/usr/bin/env node

import http from "http";
import {join} from "path";
import {Database} from "@zingle/sqlite";
import {Sqlite3Storage} from "@zingle/smtpd";
import {readConfig} from "@zingle/smtpd";
import {requestListener} from "@zingle/smtpd";

if (!await start(process)) {
  console.error("failed to start server");
  process.exit(1);
}

async function start(process) {
  const config = await readConfig(process);
  const userdb = await createStorage(config);
  const httpServer = createHTTPServer({...config.http, userdb});

  httpServer.listen();

  return true;
}

function createHTTPServer({user, pass, port, userdb}) {
  const listener = requestListener({user, pass, userdb});
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

async function createStorage({dir}) {
  const filename = join(dir, "user.db");
  const db = new Database(filename);
  await Sqlite3Storage.initialize(db);
  return new Sqlite3Storage(db);
}
