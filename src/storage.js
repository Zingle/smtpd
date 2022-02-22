import SQL from "@zingle/sqlt";

export class Sqlite3Storage {
  constructor(db) {
    this.db = db;
  }

  static async initialize(db) {
    await db.run(`
      create table if not exists user (
        email varchar not null primary key,
        uri varchar not null,
        forward_url varchar
      )
    `);

    return db;
  }

  async getItem(keyName) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    }

    const user = await this.db.get(SQL`
      select * from user where email = ${keyName}
    `);

    if (user) {
      user.forwardURL = user.forward_url;
      delete user.forward_url;
    }

    return user;
  }

  async setItem(keyName, keyValue) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    } else if (typeof keyValue !== "object") {
      throw new TypeError("keyValue must be an object");
    }

    await this.db.run(SQL`
      insert into user (email, uri, forward_url)
      values (${keyName}, ${keyValue.uri}, ${keyValue.forwardURL||null})
    `);
  }

  async removeItem(keyName) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    }

    await this.db.run(SQL`
      delete from user where email = ${keyName}
    `);
  }
}
