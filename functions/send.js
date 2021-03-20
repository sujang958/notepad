const nodemailer = require('nodemailer');

class Mail {
    constructor(id, password) {
        const transporter = nodemailer.createTransport({
            service: 'naver',
            host: 'smtp.naver.com',
            port: 587,
            auth: {
                user: id,
                pass: password,
            }
        });
        this.id = id;
        /**
         * @type {nodemailer.Transporter}
         */
        this.transporter = transporter;
        console.log('[Mail] Initialize Mail');
    }

    createMailOption(email, title, description) {
        const mailOptions = {
            from: this.id,
            to: email,
            subject: title,
            text: description,
        };
    
        return mailOptions;
    }

    send(mailOptions) {
        this.transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                throw new Error(error)
            } else {
                console.log(`[Mail] Send mail to ${mailOptions.to}`);
            }
        });
    }
}

module.exports = Mail;