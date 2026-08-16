# Takes a mongodump of Atlas and streams it straight into S3.
#
# There is no official image carrying both mongodump and the AWS CLI, and the two
# have to be in the same container: the dump is piped rather than written to disk,
# so nothing large ever lands on an instance with 30 GB of root volume and four
# other containers on it.
#
# arm64, like everything else here — the deploy target is Graviton.
FROM amazon/aws-cli:2.27.49

# mongodump ships in mongodb-database-tools, not in the server packages. The base
# image is Amazon Linux 2, so this is the amazon/2 repo and yum rather than dnf.
# MongoDB only publishes 8.0 for Amazon Linux 2023; the 7.0 repo is what exists for
# 2, and the tools in it are versioned separately and speak to an 8.0 server.
RUN printf '%s\n' \
      '[mongodb-org-7.0]' \
      'name=MongoDB Repository' \
      'baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/7.0/aarch64/' \
      'gpgcheck=1' \
      'enabled=1' \
      'gpgkey=https://pgp.mongodb.com/server-7.0.asc' \
      > /etc/yum.repos.d/mongodb-org-7.0.repo \
 && yum install -y mongodb-database-tools gzip \
 && yum clean all \
 && rm -rf /var/cache/yum

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
