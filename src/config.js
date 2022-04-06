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
  s3: verifyS3,
  http: {
    port: 2500,
    tls: verifyTLS
  },
  smtp: {
    port: 25,
    name: hostname(),
    banner: "send it on over",
    size: bytesized("20 MiB"),
    tls: verifyTLS
  }
};

function verifyS3(s3) {
  if (s3 === undefined) return true;
  if (typeof s3.accessKeyId !== "string") return false;
  if (typeof s3.secretAccessKey !== "string") return false;
  return true;
}

function verifyTLS(tls) {
  if (tls === undefined) return true;
  if (tls && tls.pfx) return true;
  if (tls && tls.cert && tls.key) return true;
  return false;
}
