import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		require: [true, "username is required "],
		unique: [true, "username is already registered"]
	},
	email: {
		type: String,
		require: [true, "email is required"],
		unique: [true, "email is already registered"]
	},
	password: {
		type: String,
		require: [true, "password is undefined"]
	},
	verified: {
		type: Boolean,
		default: false
	}
});

const userModel = mongoose.model("users", userSchema);

export default userModel;
