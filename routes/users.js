import express from 'express';
import { User, createUser, comparePassword, getUserByEmail, getUserById } from '../models/User';
import passport from 'passport';
import async from 'async';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import config from 'config'

let LocalStrategy = require('passport-local').Strategy;
let router =  express.Router();

router.get('/', function(req, res){
	res.render('pages/users');
});

router.get('/register', function(req, res){
  	res.render('pages/register');
});

router.post('/register', function(req, res){
  	let name = req.body.name;
	let email = req.body.email;
	let password = req.body.password;
	let cfm_pwd = req.body.cfm_pwd;

	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Please enter a valid email').isEmail();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('cfm_pwd', 'Confirm Password is required').notEmpty();
	req.checkBody('cfm_pwd', 'Confirm Password Must Matches With Password').equals(password);

	let errors = req.validationErrors();
	if(errors)
	{
		res.render('pages/register',{errors: errors});
	}
	else
	{
		let user = new User({
		name: name,
		email: email,
		password: password
		});
		createUser(user, function(err, user){
			if(err) throw err;
			else console.log(user);
		});
		req.flash('success_message','You have registered, Now please login');
		res.redirect('login');
	}
});

router.get('/login', function(req, res){
  res.render('pages/login');
});

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

router.post('/login', passport.authenticate('local', {
	failureRedirect: '/users/login', failureFlash: true
	}), 
	function(req, res){
		req.flash('success_message', 'You are now Logged in!!');
  		res.redirect('/');
	}
);

router.get('/logout', function(req, res){
	req.logout();
	req.flash('success_message', 'You are logged out');
	res.redirect('/users/login');
});

router.get('/forgot', function(req, res){
	console.log(config.aws.ses_access_key)
	res.render('pages/forgot');
});

router.post('/forgot', function(req, res, next) {
	async.waterfall([
	  function(done) {
		crypto.randomBytes(20, function(err, buf) {
		  var token = buf.toString('hex');
		  done(err, token);
		});
	  },
	  function(token, done) {
		User.findOne({ email: req.body.email }, function(err, user) {
		  if (!user) {
			req.flash('error', 'No account with that email address exists.');
			return res.redirect('/users/forgot');
		  }
  
		  user.resetPasswordToken = token;
		  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
		  user.save(function(err) {
			done(err, token, user);
		  });
		});
	  },
	  function(token, user, done) {
		const sesConfig = new AWS.Config({
			credentials: {
				accessKeyId: config.aws.ses_access_key,
				secretAccessKey: config.aws.ses_secret_key,
			},
			region: 'us-east-1',
		});
		const SES = new AWS.SES(sesConfig);
		var smtpTransport = nodemailer.createTransport({SES});
		var mailOptions = {
		  to: user.email,
		  from: config.aws.ses_authorized_from_email,
		  subject: 'GeoMarvel Candy Password Reset',
		  text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
			'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
			'http://' + req.headers.host + '/reset/' + token + '\n\n' +
			'If you did not request this, please ignore this email and your password will remain unchanged.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
		  req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
		  done(err, 'done');
		});

	  }
	], function(err) {
	  if (err) return next(err);
	  res.redirect('/');
	});
  });

  router.get('/reset/:token', function(req, res) {
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
	  if (!user) {
		req.flash('error', 'Password reset token is invalid or has expired.');
		return res.redirect('/users/forgot');
	  }
	  res.render('pages/reset', {
		user: req.user
	  });
	});
  });


  router.post('/reset/:token', function(req, res) {
	async.waterfall([
	  function(done) {
		User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
		  if (!user) {
			req.flash('error', 'Password reset token is invalid or has expired.');
			return res.redirect('back');
		  }
  
			user.password = req.body.password;
			bcrypt.genSalt(10, function(err, salt) {
				bcrypt.hash(req.body.password, salt, function(err, hash) {

					user.password = hash;
					user.resetPasswordToken = undefined;
					user.resetPasswordExpires = undefined;
					user.save(function(err) {
						req.logIn(user, function(err) {
							done(err, user);
						});
					});
				});
			});
		});
	  },
	  function(user, done) {
		const sesConfig = new AWS.Config({
			credentials: {
				accessKeyId: config.aws.ses_access_key,
				secretAccessKey: config.aws.ses_secret_key,
			},
			region: 'us-east-1',
		});
		const SES = new AWS.SES(sesConfig);
		var smtpTransport = nodemailer.createTransport({SES});
		var mailOptions = {
		  to: user.email,
		  from: config.aws.ses_authorized_from_email,
		  subject: 'Your password has been changed',
		  text: 'Hello,\n\n' +
			'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
		  req.flash('success', 'Success! Your password has been changed.');
		  done(err);
		});
	  }
	], function(err) {
	  res.redirect('/');
	});
  });

export default router;