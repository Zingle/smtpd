#!/usr/bin/env node

import {join} from "path";
import {open} from "sqlite";
import Sqlite3 from "sqlite3";
import {Sqlite3Storage} from "@zingle/smtpd";

const storage = await makeStorage(process.cwd());

async function makeStorage(dir) {
  const filename = join(dir, "user.db");
  const driver = Sqlite3.Database;
  const db = await open({filename, driver});

  await Sqlite3Storage.initialize(db);

  return new Sqlite3Storage(db);
}
