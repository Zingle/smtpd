import {randomBytes} from "crypto";
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
        drop_url varchar(250) not null,
        rev char(16) not null,
        index (rev)
      );
    `);

    return cn;
  }

  async addUser(user) {
    this.#validateUser(user);

    await this.cn.query(SQL`
      insert into user (email, uri, drop_url, rev)
      values (${user.email}, ${user.uri}, ${user.drop_url}, ${genid()})
    `.toString());
  }

  async getUser(email) {
    return this.#selectOne(SQL`
      select email, uri, drop_url from user where email = ${email}
    `);
  }

  async removeUser(email, rev=undefined) {
    const andRev = rev ? SQL`` : SQL` and rev = ${rev}`;

    return this.#update(SQL`
      delete from user where email = ${email}${andRev}
    `);
  }

  async updateUser(user, rev) {
    this.#validateUser(user);

    const newrev = genid();

    return this.#update(SQL`
      update user
      set uri = ${user.uri}, drop_url = ${user.drop_url}, rev = ${newrev}
      where email = ${user.email} and rev = ${rev}
    `).then(updated => updated ? newrev : false);
  }

  async #selectOne(query) {
    const result = await this.cn.query(String(query));
    return result[0];
  }

  async #update(query) {
    const result = await this.cn.query(String(query));
    return result.affectedRows > 0;
  }

  #validateUser(user) {
    const {email, uri, drop_url, ...extra} = user;

    if (Object.keys(extra).length) {
      throw new Error(`unknown key ${Object.keys(extra)[0]}`);
    } else if (!email) {
      throw new Error("missing email");
    } else if (!email.includes("@")) {
      throw new Error("invalid email");
    } else if (!uri) {
      throw new Error("missing user URI");
    } else if (!drop_url) {
      throw new Error("missing drop_url");
    } else if (!String(drop_url).startsWith("s3:")) {
      throw new Error("unsupported scheme in drop URL");
    } else if (String(drop_url).slice(-1) !== "/") {
      throw new Error("drop URL should end in slash");
    }
  }
}

function genid() {
  return randomBytes(8).toString("hex");
}
