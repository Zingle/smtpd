import SQL from "@zingle/sqlt";

export class Storage {
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

  async getUser(email) {
    if (typeof email !== "string") {
      throw new TypeError("email must be a string");
    }

    const user = await this.db.get(SQL`
      select * from user where email = ${email}
    `);

    if (user) {
      user.forwardURL = user.forward_url;
      delete user.forward_url;
    }

    return user;
  }

  async setUser(email, user) {
    if (typeof email !== "string") {
      throw new TypeError("email must be a string");
    } else if (typeof user !== "object") {
      throw new TypeError("user must be an object");
    }

    await this.db.run(SQL`
      insert into user (email, uri, forward_url)
      values (${email}, ${user.uri}, ${user.forwardURL||null})
    `);
  }

  async removeUser(email) {
    if (typeof email !== "string") {
      throw new TypeError("email must be a string");
    }

    await this.db.run(SQL`
      delete from user where email = ${email}
    `);
  }
}
