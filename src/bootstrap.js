import express from 'express';
import path from 'path';
import cookeParser from 'cookie-parser';
import bodyParser from 'body-parser';
import expressValidator from 'express-validator';
import flash from 'connect-flash';
import session from 'express-session';
import passport from 'passport';
import mongoose from 'mongoose';
import index from './controllers/index';
import account from './controllers/account';
import passwordReset from './controllers/passwordReset'
import { User, createUser, comparePassword, getUserByEmail, getUserById } from './models/User';

module.exports = {
    boot() {

		const LocalStrategy = require('passport-local').Strategy;

		passport.use(new LocalStrategy({
			usernameField: 'email',
			passwordField: 'password',
			passReqToCallback : true
		},
			function(req, email, password, done) {
				getUserByEmail(email, function(err, user) {
					if (err) { return done(err); }
					if (!user) {
						return done(null, false, req.flash('error_message', 'No email is found'));
					}
					comparePassword(password, user.password, function(err, isMatch) {
						if (err) { return done(err); }
						if(isMatch){
								return done(null, user, req.flash('success_message', 'You have successfully logged in!!'));
						}
						else{
								return done(null, false, req.flash('error_message', 'Incorrect Password'));
						}
					});
				});
			}
		));

		passport.serializeUser(function(user, done) {
			done(null, user._id);
		});

		passport.deserializeUser(function(id, done) {
			getUserById(id, function(err, user) {
				done(err, user);
			});
		});
        mongoose.Promise = global.Promise;
		mongoose.connect('mongodb://localhost/CRMDB', {
			// useMongoClient: true
		});
		mongoose.connect;

		const app = express();

		app.use(express.static(__dirname + '/public'));

		app.set('views', path.join(__dirname, '/views'));
		app.set('view engine', 'pug');

		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({extended: false}));
		app.use(cookeParser());

		app.use(session({
			secret: 'keyboard cat',
			resave: false,
			saveUninitialized: true,
		}));

		app.use(passport.initialize());
		app.use(passport.session());

		app.use(expressValidator());

		app.use(flash());

		app.use(function(req, res, next){
			res.locals.success_message = req.flash('success_message');
			res.locals.error_message = req.flash('error_message');
			res.locals.error = req.flash('error');
			res.locals.user = req.user || null;
			next();
		});

		app.use('/', index);
		app.use('/', passwordReset);
		app.use('/account', account);

		return new Promise((resolve, reject) =>{
			resolve(app)
		})
    }
}