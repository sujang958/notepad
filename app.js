// Dependencies
const express = require('express');
const MongoDB = require('mongodb');
const Cryptr = require('cryptr');
const { config } = require('dotenv');
const cookie = require('cookie-parser');
const body = require('body-parser');
const Mail = require('./functions/send');

// Variables
config();
const PORT = process.env.PORT || 3000;

// App
const cryptr = new Cryptr(process.env.ASDF);
const app = express();
const mailer = new Mail('enter7377', cryptr.decrypt(process.env.MAIL_PW));
const DBClient = new MongoDB.MongoClient(`mongodb+srv://user:${cryptr.decrypt(process.env.DB_PW)}@cluster0.i3cgq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Setting
app.db = {};
DBClient.connect().then(db => {
    app.db.user = db.db('notepad').collection('user');
    app.db.cookie = db.db('notepad').collection('cookie');
    app.db.note = db.db('notepad').collection('note');
});

// MiddleWares
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(body.urlencoded({extended: false}));
app.use(body.json());
app.use(express.json());
app.use(cookie());
app.use(express.static('public'));

// Route
app.get('/', async (req, res) => {
    if (req.cookies.isLogin) {
        let ipDB = await app.db.cookie.findOne({_id: req.ip});
        if (ipDB) {
            req.sess
        } else {
            res.render('sign_in');
        }
    } else {
        res.render('sign_in');
    }
});

app.post('/sign_in', async (req, res) => {
    const { email } = req.body;

    if (!email) return res.send('<script>alert("이메일을 입력해주세요!");</script>').redirect('/');

    let userDB = await app.db.user.findOne({_id: email});
    if (userDB) return res.send('<script>alert("이미 가입한 이메일입니다!");</script>').redirect('/');

    await app.db.user.insertOne({
        _id: email,
        auth: false,
    });
});

// Listen
app.listen(PORT, () => {
    console.log(`Listening on`, PORT);
});