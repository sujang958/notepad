// Dependencies
const Cryptr = require('cryptr');
const { config } = require('dotenv');
const Mail = require('./functions/send');

// Variables
config();
const cryptr = new Cryptr(process.env.ASDF)

let mailer = new Mail(`enter7377@naver.com`, cryptr.decrypt(process.env.MAIL_PW));
let option = mailer.createMailOption('enter7377@naver.com', 'asdf', 'asdf')
mailer.send(option);