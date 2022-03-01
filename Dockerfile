FROM node:16

COPY . /tmp/smtpd.js

RUN npm pack /tmp/smtpd.js \
 && npm install -g zingle-smtpd-* \
 && rm -fr /tmp/smtpd.js zingle-smtpd-*

CMD /usr/local/bin/smtpd /etc/smtpd.conf
