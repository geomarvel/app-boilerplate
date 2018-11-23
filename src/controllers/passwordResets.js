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