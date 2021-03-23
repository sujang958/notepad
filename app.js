// Dependencies
const express = require('express');
const MongoDB = require('mongodb');
const Cryptr = require('cryptr');
const { config } = require('dotenv');
const cookie = require('cookie-parser');
const body = require('body-parser');
const Mail = require('./functions/send');
const UUID = require('uuid').v4;
const session = require('express-session');

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
    console.log('[DB] Connect to DB');
    // Listen
    app.listen(PORT, () => {
        console.log(`Listening on`, PORT);
    });
});

// MiddleWares
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(body.urlencoded({extended: false}));
app.use(body.json());
app.use(express.json());
app.use(cookie());
app.use(express.static(__dirname + '/public'));
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'asdf',
}));
// app.use((req, res, next) => {
//     res.status(404).render('404');
// });

// Route
app.get('/asdf', async (req, res) => {
    if (!req.session.i) req.session.i = 0;
    req.session.i += 1;
    res.send(`<p>${req.session.i}</p>`);
});
app.get('/', async (req, res) => {
    let cookieDB = await app.db.cookie.findOne({_id: req.ip});
    if (cookieDB) {
        req.session.mail = cookieDB.email;
        return res.redirect('/home');
    } else if (req.cookies.isLogin) {
        let cookieDB = await app.db.cookie.findOne({_id: req.ip});
        console.log(cookieDB);
        if (cookieDB) {
            req.session.mail = cookieDB.email;
            return res.redirect('/home');
        } else {
            return res.redirect('sign_in');
        }
    } else {
        return res.redirect('sign_up');
    }
});

app.get('/sign_in', async (req, res) => {
    return res.render('sign_in');
});

app.get('/sign_up', async (req, res) => {
    return res.render('sign_up');
});

app.post('/sign_up', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.send('<script>alert("이메일을 입력해주세요!");history.back();</script>');
    let userDB = await app.db.user.findOne({_id: email});
    if (userDB) return res.send('<script>alert("이미 가입한 이메일입니다!");history.back();</script>');
    if (req.body.remember) {
        res.cookie('isLogin', '1');
        app.db.cookie.insertOne({
            _id: req.ip,
            email,
        });
    }
    
    let i = 0;
    let code = '';
    while (i < 5) {
        code = UUID();
        var checkDB = await app.db.user.findOne({code: code});
        console.log(checkDB);
        if (!checkDB) i += 100;
        else continue;
    }
    
    await app.db.user.insertOne({
        _id: email,
        auth: false,
        code,
    });
    
    mailer.send(mailer.createMailOption(email, '[NotePad] 이메일 인증', `http://sujang958.ga/verify/${code}\n이 링크를 다른사람에게 보여주지마세요`));
    res.send('<script>alert("이메일로 인증 메일을 보냈습니다, 확인해주세요");history.back();</script>');
});

app.get('/verify/:code', async (req, res) => {
    const { code } = req.params;
    if (!code)
        return res.send('<script>alert("이메일을 입력해주세요!");history.back();</script>');
    let userDB = await app.db.user.findOne({code: code});
    if (!userDB)
        return res.send('<script>alert("이메일을 입력해주세요!")history.back();</script>');
    if (userDB.auth)
        return res.send('<script>alert("이미 인증된 계정입니다!");history.back();</script>');
    
    
    await app.db.user.findOneAndUpdate({_id: userDB._id}, {
        $set: {
            auth: true,
        }
    });
    
    console.log(userDB);
    req.session.mail = userDB._id;
    res.redirect('/home');
});

app.get('/home', async (req, res) => {
    if (req.session.mail) {
        res.send(`<p>${req.session.mail.split('@')[0]} 님</p><p><a href="/logout">로그아웃</a>`);
    } else {
        res.redirect('/');
    }
});

app.get('/logout', async (req, res) => {
    if (req.session.mail) {
        res.clearCookie('isLogin');
        app.db.cookie.findOneAndDelete({_id: req.ip})
        .then(() => {
            req.session.destroy();
            return res.send(`<script>alert('로그아웃 했습니다');location.href="/";</script>`);
        });
    } else {
        return res.send(`<script>alert('로그인하지 않았습니다');location.href="/";</script>`);
    }
});