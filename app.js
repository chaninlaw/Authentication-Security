require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook');
const findOrCreate = require("mongoose-findorcreate");

const app = express();


app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);
mongoose.connect("mongodb://localhost:27017/userDB");


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const secret = process.env.SECRET;


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.F_APP_ID,
    clientSecret: process.env.F_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", function (req, res) {
    res.render("home", {
        check: req.session.passport
    });
});

app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, function (err) {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        });

    });

app.route("/register")
    .get(function (req, res) {
        res.render("register");
    })
    .post(function (req, res) {

        User.register({ username: req.body.username }, req.body.password, function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        });

    });

app.route("/secrets")
    .get(function (req, res) {
        User.find({ secret: { $ne: null } }, function (err, foundUsers) {
            if (err) throw err;
            if (foundUsers) {
                res.render("secrets", {
                    usersWithSecrets: foundUsers,
                    check: req.session.passport
                });
            }
        });
    });

app.route("/logout")
    .get(function (req, res) {
        req.logout(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.redirect("/");
            }
        });
    });

app.route("/auth/google")
    .get(passport.authenticate("google", { scope: ["profile"] }));

app.route("/auth/google/secrets")
    .get(passport.authenticate("google", { failureRedirect: ("/login") }), function (req, res) {
        res.redirect("/secrets");
    });

app.route("/login/federated/facebook")
    .get(passport.authenticate("facebook", { scope: ['user_friends', 'email'] }));

app.route("/auth/facebook/secrets")
    .get(passport.authenticate('facebook', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
    }));

app.route("/submit")
    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })
    .post(function (req, res) {
        const submittiedSecret = req.body.secret;
        User.findById(req.user.id, function (err, foundUser) {
            if (err) throw err;
            if (foundUser) {
                foundUser.secret = submittiedSecret;
                foundUser.save(function () {
                    res.redirect("/secrets");
                });
            }
        })
    });






app.listen(3000, function () {
    console.log("Sever running on port 3000.");
});