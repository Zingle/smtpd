import SQL from "@zingle/sqlt";

export class Storage {
  constructor(db) {
    this.db = db;
  }

  static async initialize(db) {
    await db.exec(`
      create table if not exists user (
        email text not null primary key,
        uri text not null,
        forward_url text
      );

      create table if not exists file (
        path text not null,
        forward_url text not null,
        locked_at text
      );
    `);

    return db;
  }

  async addFile(path, forwardURL) {
    console.debug("addFile:", path, forwardURL);
    await this.db.run(SQL`
      insert into file (path, forward_url)
      values (${path}, ${forwardURL})
    `);
  }

  async addUser(user) {
    await this.db.run(SQL`
      insert into user (email, uri, forward_url)
      values (${user.email}, ${user.uri}, ${user.forwardURL})
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

  async removeFile(path) {
    await this.db.run(SQL`
      delete from file where path = ${path}
    `);
  }

  async removeUser(email) {
    await this.db.run(SQL`
      delete from user where email = ${email}
    `);
  }
}
