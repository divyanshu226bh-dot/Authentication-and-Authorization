import userModel from "../models/user.model.js";
import sessionModel from "../models/session.model.js";
import otpModel from "../models/otp.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { sendEmail } from "../services/email.service.js";
import { generateOtp , getOtpHtml } from "../utils/utils.js";
import { get } from "http";


export async function registerUser(req, res){
	const {username, email , password} = req.body;

	const isRegisteredBefore = await userModel.findOne({
		$or: [
			{username},
			{email}
		]
	});

	if(isRegisteredBefore){
		return res.status(409).json({
			message: "user is already registered"
		});
	}

	const hashPassword = crypto.createHash("sha256").update(password).digest("hex");

	const user = await userModel.create({username, email , password: hashPassword});

	const otp = generateOtp();
	const html = getOtpHtml(otp);

	const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

	await otpModel.create({
		email,
		user: user._id,
		otpHash
	})

	await sendEmail(email, "OTP Verification", `Your OTP code is ${otp}`, html );

	res.status(201).json({
		message: "user registered successfully",
		username,
		email,
		verified: user.verified
	});
}

export async function login(req, res){
	const {email , password} = req.body;

	const user = await userModel.findOne({email});

	if(!user){
		return res.status(401).json({
			message: "user not registered"
		})
	};

	if(!user.verified){
		return res.status(401).json({
			message : "Emall not verified"
		})
	}

	const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

	if(user.password !== passwordHash){
		return res.status(401).json({
			message: "password invalid"
		})
	}

	const refreshToken = jwt.sign({id: user._id}, config.JWT_SECRET, {expiresIn: "7d"});
	
	const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
	const session = await sessionModel.create({user: user._id, refreshTokenHash, ip: req.ip, userAgent: req.headers["user-agent"]})
	const accessToken = jwt.sign({id: user._id}, config.JWT_SECRET, {expiresIn: "10m"});

	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000
	});

	res.status(200).json({
		message: "user logged in successfully",
		username: user.username,
		email: user.email,
		accessToken
	})
}

export async function getMe(req, res){
	const authHeader = req.headers["authorization"];

	if(!authHeader || !authHeader.startsWith("Bearer ")){
		return res.status(401).json({
			message: "accessToken is missing"
		})
	};

	const accessToken = authHeader.split(" ")[1];

	const decoded = jwt.verify(accessToken , config.JWT_SECRET);

	const user = await userModel.findById(decoded.id);

	res.status(200).json({
		message: "user fetched successfully",
		username: user.username,
		email: user.email
	})
}

export async function rotateToken(req, res){
	const refreshToken = req.cookies.refreshToken;
	if(!refreshToken){
		return res.status(401).json({
			message: "Refresh Token missing"
		})
	}

	const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

	const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

	const session = await sessionModel.findOne({
		user: decoded.id,
		refreshTokenHash,
		revoked: false
	})

	if(!session){
		return res.status(401).json({
			message: "invalid or revoked refresh token"
		})
	}
	const user = await userModel.findById(decoded.id);

	if(!user){
		return res.status(404).json({
			message: "User not found"
		})
	}

	const newRefreshToken = jwt.sign({id: user._id}, config.JWT_SECRET , {expiresIn: "7d"});
	const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex")
	const accessToken = jwt.sign({id: user._id}, config.JWT_SECRET , {expiresIn: "10m"});

	session.refreshTokenHash = newRefreshTokenHash;
	await session.save();

	res.cookie("refreshToken", newRefreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000
	});

	res.status(200).json({
		message: "Token Rotated Successfully",
		username: user.username,
		email: user.email,
		accessToken
	})
}

export async function logout(req, res){
	const refreshToken = req.cookies.refreshToken;

	if(!refreshToken){
		return res.status(401).json({
			message: "Refresh token missing"
		})
	}

	const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

	const session = await sessionModel.findOneAndUpdate({refreshTokenHash, revoked: false}, {revoked: true});

	res.clearCookie("refreshToken");

	return res.status(200).json({
		message: "Logged out successfully"
	})
}

export async function logoutAll(req, res){
	const refreshToken = req.cookies.refreshToken;

	if(!refreshToken){
		return res.status(401).json({
			message: "token is missing"
		})
	};
	
	const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

	const sessions = await sessionModel.updateMany({user: decoded.id, revoked: false}, {revoked: true})

	res.clearCookie("refreshToken");

	return res.status(200).json({
		message: "logged out from all devices successfully"
	})
}

export async function verifyEmail(req, res){
	const { otp , email} = req.body;
	const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

	const otpDoc = await otpModel.findOne({
		email,
		otpHash
	});

	if(!otpDoc){
		return res.status(400).json({
			message: "Invalid OTP"
		})
	}

	const user = await userModel.findByIdAndUpdate(otpDoc.user, {
		verified: true
	});

	await otpModel.deleteMany({user: otpDoc.user})

	return res.status(200).json({
		message: "Email verified successfully",
		user: {
			username: user.username,
			email: user.email,
			verified: user.verified
		}
	})
}