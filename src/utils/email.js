
import nodemailer from 'nodemailer';
import AWS from 'aws-sdk';
import config from 'config'

const sesConfig = new AWS.Config({
    credentials: {
        accessKeyId: config.aws.ses_access_key,
        secretAccessKey: config.aws.ses_secret_key,
    },
    region: 'us-east-1',
});

const SES = new AWS.SES(sesConfig);
var transporter = nodemailer.createTransport({SES});

module.exports = {
    send({ to, subject, text,html },done) {
        return transporter.sendMail({
            from: 'jon@geomarvel.com',
            to,
            subject,
            text,
            html,
        })
        .then((info) => {
            done()
        })
        .catch((err) => {
            done(err)
        });
    },
}