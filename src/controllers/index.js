import express from 'express';
import config from 'config'
import passport from 'passport';
import { User, createUser} from '../models/User';

let router =  express.Router();

router.get('/', isLoggedIn, function(req, res){
  	res.render('pages/index');
});

router.get('/signup', function(req, res){
	res.render('pages/register');
});
router.post('/signup', function(req, res){
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
	if(errors){
		res.render('pages/register',{errors: errors});
	}else{
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
		res.redirect('/login');
	}
});

router.get('/login', function(req, res){
  res.render('pages/login');
});

router.post('/login', passport.authenticate('local', {
	failureRedirect: '/login', failureFlash: true
	}), 
	function(req, res){
		req.flash('success_message', 'You are now Logged in!!');
  		res.redirect('/');
	}
);

router.get('/logout', function(req, res){
	req.logout();
	req.flash('success_message', 'You are logged out');
	res.redirect('/login');
});

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		next();
	}else{
		res.redirect("/login");
	}
}

export default router;