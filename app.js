require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");
const bcrypt = require("bcrypt");

const app = express();

const saltRounds = 10;

app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

mongoose.set("strictQuery", false);
mongoose.connect("mongodb://localhost:27017/userDB")


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secret = process.env.SECRET;


const User = new mongoose.model("User", userSchema);



app.get("/", function (req, res) {
    res.render("home");
});

app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {
        const username = req.body.username;
        const password = req.body.password;

        User.findOne(
            { email: username },
            function (err, foundUser) {
                if (err) {
                    console.log(err);
                } else {
                    if (foundUser) {

                        bcrypt.compare(password, foundUser.password, function (err, result) {
                            if (result === true) {
                                res.render("secrets");
                            }
                        });

                    }
                }
            });
    });

app.route("/register")
    .get(function (req, res) {
        res.render("register");
    })
    .post(function (req, res) {

        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            const newUser = new User({
                email: req.body.username,
                password: hash
            });
            newUser.save(function (err) {
                if (!err) {
                    res.render("secrets");
                } else {
                    console.log(err);
                }
            });
        });


    });









app.listen(3000, function () {
    console.log("Sever running on port 3000.");
});