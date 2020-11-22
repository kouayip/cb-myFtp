//? Defined <host>  <port>

const net = require("net");
const readline = require("readline");
const fs = require("fs");

const isUploade = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const createClient = (host, port) => {
  const client = new net.Socket();

  client.connect(port, host, () => {
    console.log("connected");
  });

  client.on("data", (data) => {
    console.log(`${data}`);
  });

  client.on("end", () => {
    rl.close();
  });

  rl.on("line", (userInput) => {
    if (userInput.trim() === "RETR") {
      isUploade = true;
    }
    client.write(userInput.trim());
  });
};

//?
createClient(process.argv[2], process.argv[3]);
