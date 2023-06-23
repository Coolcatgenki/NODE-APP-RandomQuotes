require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
 
const app = express();
const PORT= process.env.PORT || 4000;
 
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
 
app.use(session({
    secret:"Our little secret.",
    resave:false,
    saveUninitialized:false,
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: true,
    }
}));
 
app.use(passport.initialize());
app.use(passport.session());


async function main(){
    try{
        const conn= await mongoose.connect(process.env.MONGO)
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch(error) {
        console.log(error);
        process.exit(1);
    }
}

const secretSchema= new mongoose.Schema({
    content: String,
    username: String,
    mood: String,
    year: Number,
    month: Number,
    day: Number,
    hour: String,
    minutes: String,
})
 
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
});
 
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model('User', userSchema);
const Secret= new mongoose.model("secrets", secretSchema);
 
passport.use(User.createStrategy());
 
passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});
 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.URL_DEPLOYMENT+"/auth/google/quotes",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(_accessToken, _refreshToken, profile, cb) {
    User.findOrCreate({username: profile.emails[0].value, googleId: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }
));
 
app.get("/", function (req, res) {
    res.render("start-pages/home");
    console.log(req.session);
    console.log(req.user);
});
 
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile", "email"] })
);
 
app.get("/auth/google/quotes", 
  passport.authenticate('google', { failureRedirect: "/failure" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/quotes");
  });
 
app.get("/login", function (req, res) {
    if(req.isAuthenticated()){
       res.redirect("/quotes");
    }
    else{ 
    res.render("start-pages/login");
    }
});
 
app.post("/logout", function (req, res) {
    req.session.passport= null;
    req.session.save(function(err){
        if(err) next(err)
        req.session.regenerate(function(err){
            if(err) next(err)
            req.logOut(function(err){
                if(err){
                    console.log(err);
                } else{
                    res.redirect("/")
                }
            });
        })
    })
});
 
app.get("/register", function (req, res) {
    res.render("start-pages/register", {error: ""});
});
 
app.get("/quotes",async function(req,res){
    res.set("Cache-control", "no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0");
    if(req.isAuthenticated()){
    const user= req.user;
    const findUser= await User.findOne({_id: user});
    const userInitial= findUser.username.substr(0,1);
    Secret.find()
    .then(function (Realsecrets) {
      const ordered= Realsecrets.reverse();
      res.render("login-pages/quotes",{Secrets:ordered, userInitial:userInitial});
      })
    .catch(function (err) {
      console.log(err);
      })
    }
    else{
        res.redirect("/login");
    }
    console.log(req.user);
});

app.get("/your-quotes",async function(req,res){
    res.set("Cache-control", "no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0");
    if(req.isAuthenticated()){
    const user= req.user;
    const findUser= await User.findOne({_id: user});
    const userInitial= findUser.username.substr(0,1);
    Secret.find({username: findUser.username})
    .then(function (Realsecrets) {
      const ordered= Realsecrets.reverse();
      res.render("login-pages/your-quotes",{Secrets:ordered, userInitial:userInitial});
      })
    .catch(function (err) {
      console.log(err);
      })
    }
    else{
        res.redirect("/login");
    }
    console.log(req.user);
});

app.post("/deleateQuote", async function(req, res){
    if(req.isAuthenticated()){
    const idSecret= req.body.idQuote;
    const deletedQuote= await Secret.findOneAndDelete({_id:idSecret});
    if(deletedQuote){
        res.redirect("your-quotes");
    }
    else{
        res.redirect("/failure");
    }
    }
    else{
        res.redirect("/login");
    }
})
 
 
app.get("/submit", async function (req, res) {
    res.set("Cache-control", "no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0");
    if(req.isAuthenticated()){
        const user= req.user;
        const findUser= await User.findOne({_id: user});
        const userInitial= findUser.username.substr(0,1);
        res.render("login-pages/submit",{userInitial:userInitial});
    }else{
        res.redirect("/login");
    }
});
 
app.post("/submit", async function (req, res) {
    const date= new Date();
    const {content, select}= req.body;
    if(content.replace(/\s+/g, "")!=""){
    let selectS="";
    switch(select){
    case "1": selectS="#554093f9;";
    break;
    case "2": selectS="#eeae1bea;";
    break;
    case "3": selectS="#3560b6d4;";
    break;
    case "4": selectS="#6e0606f9;";
    break;
    case "5": selectS="#d1d34df9;";
    break;
    case "6": selectS="#e14d4df9;";
    break;
    }
    User.findById(req.user)
    .then((foundUser) => {
        if(foundUser) {
            let hour= date.getHours();
            let minutes= date.getMinutes();
            if(hour<10){
              hour="0"+hour;
            } 
            if(minutes<10){
               minutes="0"+minutes;
            }
            const submittedSecret = new Secret({
                content: content,
                username: foundUser.username,
                mood: selectS,
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                hour: hour,
                minutes: minutes,
             });
            submittedSecret.save()
            .then(() => {
                // console.log(foundUser);
                res.redirect("/quotes");
            })
            .catch((err) => {
                console.log(err);
            });
        }
    })
    .catch((err) => {
        console.log(err);
    });
  } else{
     res.redirect("/failure")
  }
});
 
app.post("/register", async function (req, res) {
 const {username, password, confirmPassword}= req.body;
 if(password===confirmPassword){
 User.register({username: username}, password, function(err,user){
    if(err){
        console.log(err);
        res.redirect("/register", {error: "Error, email is already in use"});
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/quotes");
        });
    }
 });
}
else{
    res.render("start-pages/register", {error: "The passwords dont match!"});
}
});
 
app.post('/login',
  passport.authenticate('local', { failureRedirect: '/failure', failureMessage: true }),
  function(_req, res) {
    res.redirect("/quotes");
});

app.get("/failure", function(req, res){
    res.render("login-pages/failure");
})
 
 
main().then(() => {
    app.listen(PORT, ()=>{
    console.log("The server is running");
})
})
