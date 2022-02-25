#!/usr/bin/env node

import http from "http";
import {join} from "path";
import {Database} from "@zingle/sqlite";
import {Storage} from "@zingle/smtpd";
import {readConfig} from "@zingle/smtpd";
import {requestListener} from "@zingle/smtpd";

if (!await start(process)) {
  console.error("failed to start server");
  process.exit(1);
}

async function start(process) {
  try {
    const config = await readConfig(process);
    const storage = await createStorage(config);
    const httpServer = createHTTPServer({...config.http, storage});

    httpServer.listen();

    return true;
  } catch (err) {
    console.error(err.message);
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

async function createStorage({dir}) {
  const filename = join(dir, "user.db");
  const db = new Database(filename);
  await Storage.initialize(db);
  return new Storage(db);
}
