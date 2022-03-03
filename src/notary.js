import {createHmac} from "crypto";

export default function notary(secret, {
  algo="sha1"
}={}) {
  return {
    sign(name) {
      if (!/^[0-9a-f]{32}\.\d+$/.test(name)) {
        throw new Error("don't know how to sign that");
      }

      const hmac = createHmac(algo, secret);
      const aid = Buffer.alloc(2);
      const mid = Buffer.from(name.slice(0,32), "hex");

      aid.writeUInt16BE(name.slice(33));    // 32 hex + 1 dot
      hmac.update(mid);
      hmac.update(aid);

      const mac = hmac.digest();

      return Buffer.concat([mid, aid, mac]).toString("base64");
    },

    verify(signed) {
      const buffer = Buffer.from(signed, "base64");
      const mac = buffer.slice(18);
      const hmac = createHmac(algo, secret);

      hmac.update(buffer.slice(0,18));      // excludes mac

      if (hmac.digest("hex") === mac.toString("hex")) {
        const mid = buffer.slice(0,16).toString("hex");
        const aid = buffer.readUInt16BE(16);
        return `${mid}.${aid}`;
      } else {
        return false;
      }
    }
  }
}
