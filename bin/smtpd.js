#!/usr/bin/env node

import {join} from "path";
import {open} from "sqlite";
import Sqlite3 from "sqlite3";
import {Sqlite3Storage} from "@zingle/smtpd";
import {readConfig} from "@zingle/smtpd";

if (!await start(process)) {
  console.error("failed to start server");
  process.exit(1);
}

async function start(process) {
  const config = await readConfig(process);
  const userdb = await makeStorage(config);
  return true;
}

async function makeStorage({dir}) {
  const filename = join(dir, "user.db");
  const driver = Sqlite3.Database;
  const db = await open({filename, driver});

  await Sqlite3Storage.initialize(db);

  return new Sqlite3Storage(db);
}
