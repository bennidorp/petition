const express = require("express");
const cookieParser = require("cookie-parser");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const database = require("./database.js");
const bcrypt = require("./bcrypt.js");

const app = express();
app.engine("handlebars", hb());
app.set("view engine", "handlebars");
app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
    cookieSession({
        maxAge: 1000 * 60 * 60 * 24 * 30,
        secret: "wertfvuj462446464bkbgkzgiuj45678987654e",
    })
);
app.use(csurf());

app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    const { firstname, lastname, email, password } = req.body;

    if (!firstname || !lastname || !email || !password) {
        res.render("register", {
            error: "You missed something.",
            firstname: firstname,
            lastname: lastname,
        });
    } else {
        bcrypt
            .hash(password)
            .then((hashedPassword) => {
                database
                    .addUser(firstname, lastname, email, hashedPassword)
                    .then((userData) => {
                        req.session.user = userData.rows[0];
                        res.redirect(302, "/profile");
                    })

                    .catch((error) => {
                        res.render("register", {
                            error: "Oops... Give it another try.",
                            firstname,
                            lastname,
                        });
                        console.log("error", error);
                    });
            })
            .catch((error) => console.log(error));
    }
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.render("login", {
            error: "You missed something. Happens to the best of us.",
        });
    }

    database.getUserByEmail(email).then((results) => {
        if (results.rows.length == 0) {
            return res.render("login", {
                error: "Oops.. Try again.",
            });
        }
        const user = results.rows[0];
        bcrypt.compare(password, user.password_hash).then((valid) => {
            if (!valid) {
                return res.render("login", {
                    error: "Oops.. Try again.",
                });
            }
            req.session.user = user;
            res.redirect(302, "/thank_you");
        });
    });
});

app.get("/profile", (req, res) => {
    res.render("profile");
});

app.post("/profile", (req, res) => {
    const { age, city, homepage } = req.body;
    if (!age || !city) {
        return res.render("profile", {
            error: "You missed something. Happens to the best of us.",
            age,
            city,
            homepage,
        });
    }
    const userID = req.session.user.id;
    database.addProfile(userID, age, city, homepage).then((results) => {
        res.redirect("/sign");
    });
});

app.get("/sign", (req, res) => {
    res.render("sign");
});

app.post("/sign", (req, res) => {
    const userId = req.session.user.id;
    const signatureCode = req.body.signature_code;

    if (!signatureCode) {
        return res.render("sign", {
            error: "No signature u no leave!",
            signatureCode,
        });
    }

    database
        .addSignature(userId, signatureCode)
        .then((result) => {
            res.redirect(302, "/thank_you");
        })
        .catch((error) => {
            console.log(error);
            res.send("We're on lunch break. Please try again later");
        });
});

app.get("/thank_you", (req, res) => {
    const userID = req.session.user.id;
    database.getSignatureForUserId(userID).then((results) => {
        const signature = results.rows[0];
        res.render("thank_you", {
            signature: signature,
        });
    });
});

app.get("/signers", (req, res) => {
    database.getSigners().then((results) => {
        res.render("signers", {
            signers: results.rows,
        });
    });
});

app.get("/user_profile/edit", (req, res) => {
    if (!req.session.user) {
        return res.redirect(302, "/register");
    }

    const userId = req.session.user.id;
    Promise.all([
        database.getUser(userId),
        database.getProfileForUserId(userId),
    ]).then((results) => {
        const userInfo = results[0].rows[0];
        const profileInfo = results[1].rows[0];

        res.render("user_profile", {
            ...userInfo,
            ...profileInfo,
            message: req.query.message,
        });
    });
});

app.post("/user_profile/edit", (req, res) => {
    if (!req.session.user) {
        return res.redirect(302, "/register");
    }

    const userId = req.session.user.id;
    const { firstname, lastname, email } = req.body;
    const userUpdatePromise = database.updateUser(
        userId,
        firstname,
        lastname,
        email
    );

    const { password } = req.body;
    let passwordUpdatePromise;
    if (password) {
        passwordUpdatePromise = bcrypt.hash(password).then((hashedPassword) => {
            return database.updateUserPassword(userId, hashedPassword);
        });
    }

    const { age, city, homepage } = req.body;
    const profilePromise = database.insertOrUpdateProfile(
        userId,
        age,
        city,
        homepage
    );

    Promise.all([userUpdatePromise, passwordUpdatePromise, profilePromise])
        .then((results) => {
            res.redirect(302, "/user_profile/edit?message=Profile changed");
        })
        .catch((error) => {
            res.render("user_profile", {
                error: "Try again.",
                ...req.body,
            });
        });
});

app.get("/", (req, res) => {
    if (req.cookies.signed == "true") {
        res.redirect(302, "/thank_you");
    } else {
        res.render("home");
    }
});

app.listen(process.env.PORT || 8080);
