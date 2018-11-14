module.exports = {
    port: 3000,
    env: process.env.NODE_ENV || 'development',
    log: {
        pretty: true,
        level: 'debug',
    },
    aws: {
        ses_access_key: '',
        ses_secret_key: '',
        ses_region:'',
        ses_authorized_from_email:''
    },
    baseUrl: 'http://localhost:3000',
    passwordResetTokenMaxAgeMillis: 1000 * 60 * 60 * 24 * 3,
};