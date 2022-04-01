The Zingle SMTP daemon (**smtpd**) accepts emails with attachments and writes
those attachments to Amazon S3.

Installing smtpd
================
Install the **smtpd** command using **npm**.

```sh
sudo -H npm install -g @zingle/smtpd
```

Using smtpd
===========
To start the SMTP daemon, run the **smtpd** command, optionally passing a path
to the configuration file.  If no configuration file is specified, there should
be a file in the current directory named *smtpd.conf*.

```sh
smtpd /etc/smtpd.conf
```

Configuring smtpd
=================
The **smtpd** configuration must be a valid JSON file.  The following settings
are recognized in the JSON file.  Settings with a "." in the name represent
nested values within the JSON.

### secret
Application secret used to verify and sign JSON Web Tokens (JWTs) for
communication between services.  If none is provided in the configuration,
a random secret will be generated.  This can be useful for testing, but keep
in mind it changes each time the daemon is started, so JWTs generated will no
longer work after a restart.

### db
Connection string for user database.  This should be a JDBC-style URL
describing a connection to a MariaDB database.  This setting is required.

Example: *mysql://foouser:mysekret@db01.example.com:3306/my_schema*

### http.port
Port **smtpd** listens for the administration API.  This setting is optional
and defaults to 2500.

### smtp.port
Port **smtpd** listens for SMTP messages.  This setting is optional and
defaults to 25.

### smtp.name
Name used to identify the server to SMTP clients.  This setting is optional
and defaults to the host name.

### smtp.banner
Welcome message send to SMTP clients.  This setting is optional.

### smtp.size
Limit on SMTP attachment size.  This setting is optional and defaults to 20
MiB.

### tls.cert
Path to TLS cert in PEM format, used to secure HTTP/SMTP connections.  Note,
the server only supports TLS upgrade.  This setting is optional.  If not set,
the server will not use encryption.  If set, the **tls.key** option must also
be set.

### tls.pfx
Alternate path to TLS certificate in PKCS#12 binary format.  If set, this
overrides **tls.cert**.  This setting is optional.

### tls.key
Path to TLS private key in PEM format, used to secure HTTP/SMTP connections.
This setting is optional, but must be included for **tls.cert** to work.

User Administration
===================
The **smtpd** server exposes a REST-ful interface for user administration.  By
default, the API is exposed on port 2500.

Authorization
-------------
There are two methods to authorize requests to the user administration API.
The first is to make the request from localhost.  The second is to provide a
JWT bearer token in the *Authorization* header.  This token must be signed
using the same secret configured for **smtpd**.

Note: there is not currently support for generating a JWT using **smtpd**.  For
testing, it is recommended that requests be made from localhost.  Support may
be added in the future.

Create User - POST /user
------------------------
Endpoint to add a new user to the system.  The body must be a JSON document
including an "email" address which **smtpd** should accept messages for, and
a "drop_url" S3 bucket path where incoming attachments will be saved.  The S3
path must end in a slash "/"; attachments will be saved to a path using this
one as a prefix.

```
POST /user
Content-Type: application/json

{
  "email": "foo@example.com",
  "drop_url": "s3://email/env/org/foo/"
}
```

```
303 See Other
Location: /user/foo@example.com
```

Fetch User - GET /user/:email
-----------------------------
Retrieve a user from **smtpd**.  This will return a JSON document with the
"email" and "drop_url" provided when creating the user, as well as a "uri"
property specifying the relative URL of the user.

```
GET /user/foo@example.com
```

```
200 OK
Content-Type: application/json

{
  "email": "foo@example.com",
  "drop_url": "s3://email/env/org/foo/",
  "uri": "/user/foo@example.com"
}
```

Delete User - DELETE /user/:email
---------------------------------
Delete a user from **smtpd**.

```
DELETE /user/foo@example.com
```

```
204 No Content
```

TODO
====
 * user updates w/ ETag support
 * ETag support for DELETE
 * fix missing TLS on HTTP endpoint
 * /login endpoint to generate JWT
