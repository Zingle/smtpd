import {open} from "@zingle/shape";

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
  dir: process.cwd()
};
