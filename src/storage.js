import SQL from "@zingle/sqlt";

export class Storage {
  constructor(db) {
    this.db = db;
  }

  static async initialize(db) {
    await db.run(`
      create table if not exists user (
        email text not null primary key,
        uri text not null,
        forward_url text
      );
    `);

    return db;
  }

  async addUser(email, user) {
    await this.db.run(SQL`
      insert into user (email, uri, forward_url)
      values (${email}, ${user.uri}, ${user.forwardURL||null})
    `);
  }

  async getUser(email) {
    const user = await this.db.get(SQL`
      select * from user where email = ${email}
    `);

    if (user) {
      user.forwardURL = user.forward_url;
      delete user.forward_url;
    }

    return user;
  }

  async removeUser(email) {
    await this.db.run(SQL`
      delete from user where email = ${email}
    `);
  }
}
