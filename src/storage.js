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
        forward_url text not null
      );

      create table if not exists file (
        name text not null,
        forward_url text not null,
        touched_at text
      );
    `);

    return db;
  }

  async addFile(name, forwardURL) {
    await this.db.run(SQL`
      insert into file (name, forward_url)
      values (${name}, ${forwardURL})
    `);
  }

  async addUser(user) {
    await this.db.run(SQL`
      insert into user (email, uri, forward_url)
      values (${user.email}, ${user.uri}, ${user.forward_url})
    `);
  }

  async getFile(name) {
    return await this.db.get(SQL`
      select * from file where name = ${name}
    `);
  }

  async getUser(email) {
    return await this.db.get(SQL`
      select * from user where email = ${email}
    `);
  }

  async removeFile(name) {
    await this.db.run(SQL`
      delete from file where name = ${name}
    `);
  }

  async removeUser(email) {
    await this.db.run(SQL`
      delete from user where email = ${email}
    `);
  }

  async *staleFiles(olderThan) {
    yield* this.db.each(SQL`
      select * from file
      where touched_at is null
         or touched_at < ${olderThan}
    `);
  }

  async touchFile(name, touchedAt=null) {
    const result = await this.db.run(SQL`
      update file
      set touched_at = datetime()
      where name = ${name}
        and (${!touchedAt} or touched_at = ${touchedAt})
    `);

    return result.changes > 0;
  }
}
