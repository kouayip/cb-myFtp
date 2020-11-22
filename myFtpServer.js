//? Defined <port>

const net = require("net");
const fs = require("fs");
const path = require("path");

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
      return user.password === password;
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
    invoke: (socket, param, session) => {
      const username = param.trim();
      if (Query.checkUserExist(username)) {
        session.username = username;
        session.isConnected = false;
        sendMessage(socket, "200 successful identification");
      } else {
        sendMessage(socket, "532 Need account for login");
      }
    },
  },
  PASS: {
    name: "PASS",
    requireParam: true,
    connRequired: false,
    desc: "<password>: authenticate the user with a password",
    invoke: (socket, param, session) => {
      const password = param.trim();
      if (!session.username) {
        sendMessage(
          socket,
          "401 Please identify your account before logging in"
        );
      } else {
        if (Auth.login(session.username, password)) {
          session.isConnected = true;
          sendMessage(socket, "200 Successfuly connected");
        } else {
          session.isConnected = false;
          sendMessage(socket, "403 Access denied, the password is incorrect");
        }
      }
    },
  },
  LIST: {
    name: "LIST",
    requireParam: false,
    connRequired: true,
    desc: "list the current directory of the server",
    invoke: (socket) => {
      const contents = fs.readdirSync(__dirname);
      contents.forEach((s) => {
        sendMessage(socket, s);
      });
    },
  },
  CWD: {
    name: "CWD",
    requireParam: true,
    connRequired: true, //! Test
    desc: "<directory>: change the current directory of the server",
    invoke: (socket, param) => {
      const dir = param.trim();
      fs.access(dir, (err) => {
        if (err) {
          console.log(`Directory ${err ? "does not exist" : "exists"}`);
        }
      });
    },
  },
  RETR: {
    name: "RETR",
    requireParam: true,
    connRequired: true,
    desc:
      "<filename>: transfer a copy of the file FILE from the server to the client",
    invoke: (socket, param) => {
      const istream = fs.createReadStream(path.join("./files", param));
      socket.pipe(process.stdout);

      let ostream = fs.createWriteStream(
        path.join("./users/", "yves", "files", param)
      );
      istream.on("readable", function () {
        let data;
        while ((data = this.read())) {
          ostream.write(data);
        }
      });
      istream.on("end", function () {
        sendMessage(socket, "Finish");
      });
    },
  },
  STOR: {
    name: "STOR",
    requireParam: true,
    connRequired: true,
    desc:
      "<filename>: transfer a copy of the file FILE from the client to the server",
    invoke: (socket, param) => {},
  },
  PWD: {
    name: "PWD",
    requireParam: false,
    connRequired: true,
    desc: "display the name of the current directory of the server",
    invoke: (socket) => {
      socket.write(__dirname);
    },
  },
  HELP: {
    name: "HELP",
    requireParam: false,
    connRequired: false,
    desc: "send helpful information to the client",
    invoke: (socket) => {
      sendMessage(socket, showCommands());
    },
  },
  QUIT: {
    name: "QUIT",
    requireParam: false,
    connRequired: false,
    desc: "close the connection and stop the program",
    invoke: (socket) => {
      sendMessage(socket, "Goodbye and see you soon.");
      socket.end();
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
      const now = new Date().toISOString();
      const [comm, params] = data.toString().split(" ");
      const command = commands[comm.trim()];

      //?
      displayReceivedMessage(`${now} - <-- ${comm}`);

      //? Check a command exists
      if (command) {
        //? Check a command required parameter
        if (command.requireParam) {
          //? Check a parameter is defined
          if (!params) {
            sendMessage(
              socket,
              `The ${comm.trim()} command is not valid, it requires a parameter`
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
            sendMessage(
              socket,
              `Please log in to use the ${comm.trim()} command.`
            );
            return;
          }
        }
        //? Invoke a command action
        command.invoke(socket, params, userSession);
      } else {
        sendMessage(
          socket,
          "Order not found, use HELP to display all commands available"
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

const displayReceivedMessage = (message) => {
  console.log("\x1b[33m%s\x1b[0m", message);
};

const sendMessage = (socket, message) => {
  const now = new Date().toISOString();
  socket.write(`${message} \r\n`);
  console.log("\x1b[32m%s\x1b[0m", `${now} - --> ${message}`);
};

//? Create and run a Server
createServer(process.argv[2]);
