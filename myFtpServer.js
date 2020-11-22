//? Defined <port>

const net = require("net");
const fs = require("fs");
const { exit } = require("process");

//? Create Database Instance
const Query = ((database) => {
  return {
    selectUser: function (username) {
      return database.find((account) => {
        return account.username === username;
      });
    },
    checkUserExist: function (username) {
      return this.selectUser(username) !== undefined;
    },
  };
})(JSON.parse(fs.readFileSync("./config/db.json")));

//? Create authentification auth
const Auth = {
  login: (username, password) => {
    const user = Query.selectUser(username);
    if (user) {
      return {
        username,
        status: user.password === password,
      };
    }
    return false;
  },
};

//? Session storages
const Session = ((storage) => {
  return {
    start: (socket) => {
      const id = Math.floor(Math.random() * 1000);
      socket.sessionId = id;
      storage[id] = {
        id: Math.floor(Math.random() * 1000),
        username: undefined,
        isConnected: false,
      };
    },
    get: (sessionId) => {
      return storage[sessionId];
    },
  };
})({});

//? Define all available commands
const commands = {
  USER: {
    name: "USER",
    requireParam: true,
    connRequired: false,
    desc: "<username>: check if the user exist",
    invoke: (socket, param) => {
      console.log(param);
    },
  },
  PASS: {
    name: "PASS",
    requireParam: true,
    connRequired: false,
    desc: "<password>: authenticate the user with a password",
  },
  LIST: {
    name: "LIST",
    requireParam: false,
    connRequired: true,
    desc: "list the current directory of the server",
  },
  CWD: {
    name: "CWD",
    requireParam: true,
    connRequired: true,
    desc: "<directory>: change the current directory of the server",
  },
  RETR: {
    name: "RETR",
    requireParam: true,
    connRequired: true,
    desc:
      "<filename>: transfer a copy of the file FILE from the server to the client",
  },
  STOR: {
    name: "STOR",
    requireParam: true,
    connRequired: true,
    desc:
      "<filename>: transfer a copy of the file FILE from the client to the server",
  },
  PWD: {
    name: "PWD",
    requireParam: false,
    connRequired: true,
    desc: "display the name of the current directory of the server",
  },
  HELP: {
    name: "HELP",
    requireParam: false,
    connRequired: false,
    desc: "send helpful information to the client",
    invoke: (socket) => {
      socket.write(showCommands());
    },
  },
  QUIT: {
    name: "QUIT",
    requireParam: false,
    connRequired: false,
    desc: "close the connection and stop the program",
    invoke: (socket) => {
      socket.end("Goodbye and see you soon. \r\n");
    },
  },
};

//?Create server
const createServer = (port) => {
  const server = net.createServer((socket) => {
    Session.start(socket);
    console.log("New connection");
    socket.write("Hello from server\r\n");

    socket.on("data", (data) => {
      console.log(Session.get(socket.sessionId)); //! Test
      const [comm, params] = data.toString().split(" ");
      const command = commands[comm.trim()];

      //? Check a command exists
      if (command) {
        //? Check a command required parameter
        if (command.requireParam) {
          //? Check a parameter is defined
          if (!params) {
            socket.write(
              `The ${comm.trim()} command is not valid, it requires a parameter\r\n`
            );
            return;
          }
        }
        //? Get current user session
        const userSession = Session.get(socket.sessionId);

        //? Checks if the order requires a connection
        if (command.connRequired) {
          //? Checks a user is connected
          if (!userSession.isConnected) {
            socket.write(
              `Please log in to use the ${comm.trim()} command.\r\n`
            );
            return;
          }
        }
        //? Invoke a command action
        command.invoke(socket, params.trim());
      } else {
        socket.write(
          "Order not found, use HELP to display all commands available\r\n"
        );
      }
    });

    socket.on("end", () => {
      console.log("Client left");
    });
  });

  //? Start a server
  server.listen(port, () => {
    console.log(`Server started at port ${port}`);
  });
};

//? Display all available commands
const showCommands = () => {
  let message =
    "=============================== COMMANDS AVAILABLE ===============================\n";
  Object.values(commands).forEach((command) => {
    message += `${command.name}: ${command.desc}\n`;
  });
  message +=
    "==================================================================================\n\r";
  return message;
};

//// console.log(Auth.login("anonymous", "anonymous"));

//? Create and run a Server
createServer(process.argv[2]);
