import {hostname} from "os";
import {randomBytes} from "crypto";
import bytesized from "bytesized";
import {open, validate} from "@zingle/shape";

export const DEFAULT_CONF = "smtpd.conf";

export async function read({env, argv}) {
  let path = null;

  if (argv.slice(2).includes("--help")) {
    console.log(`Usage: smtpd [<conf-file>]`);
    return;
  } else if (argv.length > 3) {
    console.error(`unexpected argument -- ${argv[3]}`);
    return false;
  }

  const file = argv[2] || env.DEFAULT_CONF || "smtpd.conf";
  const config = await open(file, SMTPDConfigSchema);

  return config;
}

const SMTPDConfigSchema = {
  secret: randomBytes(8).toString("hex"),
  db: String,
  http: {
    port: 2500
  },
  smtp: {
    port: 25,
    name: hostname(),
    banner: "send it on over",
    size: bytesized("20 MiB"),
    tls: function(tls) {
      if (tls === undefined) return true;
      if (tls && tls.pfx) return true;
      if (tls && tls.cert && tls.key) return true;
      return false;
    }
  }
};
