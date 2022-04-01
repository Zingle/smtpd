import SQL from "@zingle/sqlt";

export class UserDB {
  constructor(cn) {
    this.cn = cn;
  }

  static async initialize(cn) {
    await cn.query(`
      create table if not exists user (
        email varchar(200) not null primary key,
        uri varchar(250) not null,
        drop_url varchar(250) not null
      );
    `);

    return cn;
  }

  async addUser(user) {
    if (!user.drop_url) {
      throw new Error("missing drop_url");
    } else if (!String(user.drop_url).startsWith("s3:")) {
      throw new Error("unsupported scheme in drop URL");
    } else if (String(user.drop_url).slice(-1) !== "/") {
      throw new Error("drop URL should end in slash");
    }

    await this.cn.query(SQL`
      insert into user (email, uri, drop_url)
      values (${user.email}, ${user.uri}, ${user.drop_url})
    `.toString());
  }

  async getUser(email) {
    return this.#selectOne(SQL`
      select * from user where email = ${email}
    `);
  }

  async removeUser(email) {
    await this.cn.query(SQL`
      delete from user where email = ${email}
    `.toString());
  }

  async #selectOne(query) {
    const result = await this.cn.query(String(query));
    return result[0];
  }
}
