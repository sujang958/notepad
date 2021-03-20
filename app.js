// Dependencies
const express = require('express');
const MongoDB = require('mongodb');
const Cryptr = require('cryptr');
const { config } = require('dotenv');
const cookie = require('cookie-parser');
const body = require('body-parser');
const Mail = require('./functions/send');
const UUID = require('uuid').v4;

// Variables
config();
const PORT = process.env.PORT || 3000;

// App
const cryptr = new Cryptr(process.env.ASDF);
const app = express();
const mailer = new Mail('enter7377@naver.com', cryptr.decrypt(process.env.MAIL_PW));
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
app.use((req, res, next) => {
    res.status(404).render('404');
});

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
    
    let i = 0;
    let code = '';
    while (i < 5) {
        code = UUID();
        var checkDB = await app.db.user.findOne({code: code});
        if (!checkDB) i += 100;
        else continue;
    }
    
    await app.db.user.insertOne({
        _id: email,
        auth: false,
        code,
    });
    
    mailer.send(mailer.createMailOption(email, '[NotePad] 이메일 인증', `http://localhost:3000/verify/${code}\n이 링크를 다른사람에게 보여주지마세요`));
    return res.send('<script>alert("이메일로 인증 메일을 보냈습니다, 확인해주세요");</script>').redirect('/');
});

app.get('/verify/:code', async (req, res) => {
    const { code } = req.params;
    if (!code)
        return res.send('<script>alert("이메일을 입력해주세요!");</script>').redirect('/');
    let userDB = await app.db.user.findOne({code: code});
    if (!userDB)
        return res.send('<script>alert("이메일을 입력해주세요!");</script>').redirect('/');
    if (userDB.auth)
        return res.send('<script>alert("이미 인증된 계정입니다!");</script>').redirect('/');
});

// Listen
app.listen(PORT, () => {
    console.log(`Listening on`, PORT);
});