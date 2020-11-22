//? Defined <port>

const net = require("net");

//? Define all available commands
const commands = {
  USER: {
    name: "USER",
    requireParam: true,
    desc: "<username>: check if the user exist",
  },
  PASS: {
    name: "PASS",
    requireParam: true,
    desc: "<password>: authenticate the user with a password",
  },
  LIST: {
    name: "LIST",
    requireParam: false,
    desc: "list the current directory of the server",
  },
  CWD: {
    name: "CWD",
    requireParam: true,
    desc: "<directory>: change the current directory of the server",
  },
  RETR: {
    name: "RETR",
    requireParam: true,
    desc:
      "<filename>: transfer a copy of the file FILE from the server to the client",
  },
  STOR: {
    name: "STOR",
    requireParam: true,
    desc:
      "<filename>: transfer a copy of the file FILE from the client to the server",
  },
  PWD: {
    name: "PWD",
    requireParam: false,
    desc: "display the name of the current directory of the server",
  },
  HELP: {
    name: "HELP",
    requireParam: false,
    desc: "send helpful information to the client",
  },
  QUIT: {
    name: "QUIT",
    requireParam: false,
    desc: "close the connection and stop the program",
    action: () => {},
  },
};

//?Create server
const createServer = (port) => {
  const server = net.createServer((socket) => {
    console.log("New connection");
    socket.write("Hello from server\r\n");

    socket.on("data", (data) => {
      const [comm, params] = data.toString().split(" ");
      const command = commands[comm.trim()];
      if (command) {
        console.log(comm);
      } else {
        console.log("Error");
      }
    });
  });

  //? Start a server
  server.listen(port, () => {
    console.log(`Server started at port ${port}`);
  });
};

//? Display all available commands
const showCommands = () => {
  let message = "";
  Object.values(commands).forEach((command) => {
    message += `${command.name}: ${command.desc}\n`;
  });
  return message;
};

//? Create and run a Server
createServer(process.argv[2]);
