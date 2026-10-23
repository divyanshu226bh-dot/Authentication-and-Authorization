import app from "./app.js";
import http from "http";
import config from "./src/config/config.js";
import connectDb from "./src/config/database.js";
import dns from "dns"

dns.setServers(["8.8.8.8"]);

try{
	await connectDb();
	console.log("Database connected successfully");
} catch (error) {
	console.error("Error connecting to database:", error);
}

const server = http.createServer(app);

server.listen(config.PORT, ()=>{
	console.log(`backend is running at port ${config.PORT}`);
});