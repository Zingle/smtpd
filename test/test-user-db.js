import expect from "expect.js";
import sinon from "sinon";
import {UserDB} from "@zingle/smtpd";

describe("UserDB", () => {
  let db, cn, query;

  beforeEach(() => {
    query = sinon.spy(async (sql) => Object.assign([], {sql}));
    cn = {query};
    db = new UserDB(cn);
  });

  describe("UserDB.initialize(cn)", () => {
    it("should create DB tables", async () => {
      await UserDB.initialize(cn);
      expect(query.calledOnce).to.be(true);
      expect(query.getCall(0).firstArg.includes("create table")).to.be(true);
    });
  });

  describe("new UserDB(cn)", () => {
    it("should initialize UserDB properties", () => {
      expect(db.cn).to.be(cn);
    });
  });

  describe(".addUser(user)", () => {
    it("should write user to DB", async () => {
      const email = "foo_user@example.com";
      const uri = `/user/${email}`;
      const drop_url = "s3://bucket/foo_user/";
      const user = {email, uri, drop_url};

      await db.addUser(user);

      expect(query.calledOnce).to.be(true);
      expect(query.getCall(0).firstArg.includes("insert")).to.be(true);
    });
  });

  describe(".getUser(email)", () => {
    it("should read user from DB", async () => {
      const email = "foo_user@example.com";

      await db.getUser(email);

      expect(query.calledOnce).to.be(true);
      expect(query.getCall(0).firstArg.includes("select")).to.be(true);
    });
  });

  describe(".removeUser(email)", () => {
    it("should delete user from DB", async () => {
      const email = "foo_user@example.com";

      await db.removeUser(email);

      expect(query.calledOnce).to.be(true);
      expect(query.getCall(0).firstArg.includes("delete")).to.be(true);
    });
  });
});
