import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as waitPort from "wait-port";

function createSecurityGroup() : pulumi.Output<string> {
    let group = new aws.ec2.SecurityGroup("ec2-security-group", {
        ingress: [
            { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
            { protocol: "tcp", fromPort: 3389, toPort: 3389, cidrBlocks: ["0.0.0.0/0"] }
        ],
        egress: [
            { protocol: "tcp", fromPort: 0, toPort: 65535, cidrBlocks: ["0.0.0.0/0"] }
        ],
    });
    return group.id;
}

let groupId = createSecurityGroup();
let password = "ec709c7a-5bad-4e51-b135-b10b5a346aa6";

let userData = `<powershell>
net user Administrator ${password}
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
</powershell>`;

let instance = new aws.ec2.Instance("ec2-test-instance" , {
    instanceType: "t2.small",
    ami: "ami-0d28bf0201017ce45", /*Microsoft Windows Server 2019 Base*/
    vpcSecurityGroupIds: [groupId],
    userData: userData,
    ebsBlockDevices: [
        {
            volumeSize: 1,
            deviceName: "/dev/xvdh",
        }
    ]
})

instance.publicIp.apply(ip => {
    waitPort({
        host: ip,
        port: 22,
        timeout: 600000 /*10 mins*/
    }).then((open) =>{
        if(!open){
            throw new Error(`Unable to connect to: ${ip}:22`);
        }

        var ssh2Client = require('ssh2').Client;

        var conn = new ssh2Client();
        conn.on('ready', function() {
          console.log('Client :: ready');
          conn.exec('ver', function(err, stream) {
            if (err) throw err;
            stream.on('close', function(code, signal) {
              console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
              conn.end();
            }).on('data', function(data) {
              console.log('STDOUT: ' + data);
            }).stderr.on('data', function(data) {
              console.log('STDERR: ' + data);
            });
          });
        }).connect({
          host: ip,
          port: 22,
          username: 'Administrator',
          password: password,
          debug: function(s){
            console.log('--> ' + s);
          }
        });
    });
});
