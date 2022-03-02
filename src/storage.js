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
    await this.db.run(SQL`
      insert into file (path, forward_url)
      values (${path}, ${forwardURL})
    `);
  }

  async addUser(user) {
    await this.db.run(SQL`
      insert into user (email, uri, forward_url)
      values (${user.email}, ${user.uri}, ${user.forward_url})
    `);
  }

  async getUser(email) {
    const user = await this.db.get(SQL`
      select * from user where email = ${email}
    `);

    return user;
  }

  async *lockExpired(olderThan) {
    const sql = SQL`select * from file where locked_at < ${olderThan}`;
    yield* this.db.each(sql);
  }

  async lockFile(path) {
    const result = await this.db.run(SQL`
      update file
      set locked_at = datetime()
      where path = ${path}
        and locked_at is null
    `);

    return result.changes > 0;
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

  async unlockFile(path, lockedAt=null) {
    const andLockedAt = lockedAt
      ? SQL` and locked_at = ${lockedAt}`
      : SQL``;

    const result = await this.db.run(SQL`
      update file
      set locked_at = null
      where path = ${path}${andLockedAt}
    `);

    return result.changes > 0;
  }

  async *unlockedFiles() {
    const sql = SQL`select * from file where locked_at is null`;
    yield* this.db.each(sql);
  }
}
