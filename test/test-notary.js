import expect from "expect.js";
import {notary as Notary} from "@zingle/smtpd";

describe("notary", () => {
  const filename = "abcdef0123456789abcdef0123456789.3";
  const secret = "sekret";
  let notary, signed;

  beforeEach(() => {
    notary = Notary(secret);
    signed = notary.sign(filename);
  });

  describe("(secret)", () => {
    it("should return a signing object", () => {
      expect(notary).to.be.an("object");
      expect(notary.sign).to.be.a("function");
      expect(notary.sign.length).to.be(1);
      expect(notary.verify).to.be.a("function");
      expect(notary.verify.length).to.be(1);
    });
  });

  describe("Notary.sign(name)", () => {
    it("should return base64 encoded string", () => {
      const signed = notary.sign(filename);
      expect(() => Buffer.from(signed, "base64")).to.not.throwError();
    });

    it("should throw on names in unexpected format", () => {
      expect(() => notary.sign("foo")).to.throwError();
    });
  });

  describe("Notary.verify(signed)", () => {
    let maliciousNotary;

    beforeEach(() => {
      maliciousNotary = Notary("bad key");
    });

    it("should return original signed name", () => {
      expect(notary.verify(signed)).to.be(filename);
    });

    it("should return false if not verified", () => {
      const signed = maliciousNotary.sign(filename);
      expect(notary.verify(signed)).to.be(false);
      expect(notary.verify("foo")).to.be(false);
    });
  });
});
