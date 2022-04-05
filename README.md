The Zingle SMTP daemon (**smtpd**) accepts emails with attachments and writes
those attachments to Amazon S3.

Installing smtpd
================
Install the **smtpd** command using **npm**.

```sh
sudo -H npm install -g @zingle/smtpd
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

### http.tls.cert
Path to TLS cert in PEM format, used to secure HTTP connections.  This setting
is optional.  If not set, the server will not use transport security.  If set,
the **http.tls.key** option must also be set.

### http.tls.pfx
Alternate path to TLS certificate in PKCS#12 binary format.  If set, this
overrides **http.tls.cert**.  This setting is optional.

### http.tls.key
Path to TLS private key in PEM format, used to secure HTTP connections.  This
setting is optional, but must be included for **http.tls.cert** to work.

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

### smtp.tls.cert
Path to TLS cert in PEM format, used to secure SMTP connections.  Note, the
server only supports TLS upgrade.  This setting is optional.  If not set, the
server will not use encryption.  If set, the **smtp.tls.key** option must also
be set.

### smtp.tls.pfx
Alternate path to TLS certificate in PKCS#12 binary format.  If set, this
overrides **smtp.tls.cert**.  This setting is optional.

### smtp.tls.key
Path to TLS private key in PEM format, used to secure SMTP connections.  This
setting is optional, but must be included for **smtp.tls.cert** to work.

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

Using smtpd
===========
To start the SMTP daemon, run the **smtpd** command, optionally passing a path
to the configuration file.  If no configuration file is specified, there should
be a file in the current directory named *smtpd.conf*.

```sh
smtpd /etc/smtpd.conf
```

Integrating smtpd
=================
Applications that want to integrate with smtpd can use the recommendations
outlined below.

Email Address
-------------
An email address will have to be assigned to each user.  A DNS MX record must be
in place to forward mail for the appropriate incoming domain.  The **smtpd**
server is not a forwarding mail server, so the domain should be dedicated to
this service.

S3 Inbox
--------
Each user will also need an S3 bucket and key prefix where files can be written.
The bucket must be private, as the **smtpd** server does not pass any flags to
S3 to mark the uploaded file objects as private.  The key prefix must end in
slash.

S3 Key Organization
-------------------
To make best use of the way S3 buckets and keys work, consider the following URI
scheme.

```
s3://$PRIVATE_BUCKET/$ENVIRONMENT/$ORGANIZATION/$USER_ID/
```

This scheme allows for bucket re-user in multiple environments, end-to-end
testing with the actual bucket, sharing a destination domain between different
environments, and efficient scanning.  If necessary, IAM policies can be
configured to restrict access between environments.

Processing Attachments
----------------------
When an attachment is processed by **smtpd**, it is written to S3 using the
corresponding user's S3 inbox URL as a prefix.  For example, assume the
following user has been setup.

```js
{
  "email": "rich.remer@example.com",
  "drop_url": "s3://smtpd-inbox/live/zingle/rich.remer/"
}
```

An incoming attachment to rich.remer@example.com will be saved to something like
the following S3 object URL.

```
s3://smtpd-inbox/live/acme_corp/rich.remer/9D4A387417C993F3
```

Periodically, the "live" environment should scan for new objects by performing
a prefix search on `s3://smtpd-inbox/live/`.  When this new object is picked up,
by using the "acme_corp" organization and the username "rich.remer", the
application can route to the appropriate internal user.  The application should
fetch the object from S3, process the data, then delete the object.

Because the URL structure embeds the organization and user into the scheme, it
is trivial to adjust a job to run for just a single organization or a single
user.  When developing a UX, this might be taken advantage of to perform
processing at the click of a button.
