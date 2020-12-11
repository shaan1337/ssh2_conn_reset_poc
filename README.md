Reproduction steps for: https://github.com/mscdex/ssh2/issues/902

### Launching:
```
$ aws configure   # configure AWS Access Key ID and Secret Access Key
$ npm install
$ pulumi config set aws:region us-west-2
$ pulumi up -y
```

### Cleaning up:
```
$ pulumi destroy -y
```