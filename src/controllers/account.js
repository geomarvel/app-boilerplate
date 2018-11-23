import express from 'express';
import { User, createUser, comparePassword, getUserByEmail, getUserById } from '../models/User';
import passport from 'passport';
import async from 'async';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import config from 'config'

let router =  express.Router();

router.get('/profile', function(req, res){
	res.render('pages/users');
});


export default router;